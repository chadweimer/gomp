import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Backup, Task, TaskState } from '../../../helpers/schema.gen';
import { api, fileContentSerializer } from '../../../helpers/api';
import { showAlert, showLoading, showModal, showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, scaleValue } from '../../../helpers/utils';
import { cancelTask, pollTask } from '../../../helpers/tasks';
import '../../file-upload-browser/file-upload-browser';
import '../../app-icon/app-icon';
import './page-admin-maintenance.css';

@customElement('page-admin-maintenance')
export class PageAdminMaintenance extends LitElement implements ComponentWithActivatedCallback {
  @state() backups: Backup[] = [];
  @state() activeTask?: Task;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activatedCallback().catch(console.error);
  }

  async activatedCallback() {
    await Promise.all([
      this.loadBackups(),
      this.loadActiveTasks(),
    ]);
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad" fixed>
          <ion-row>
            <ion-col>
              ${this.activeTask != null ? html`
                <ion-card color="light" class="active-task-card">
                  <ion-card-content>
                    <ion-item>
                      <ion-label>
                        <h3>${this.getTaskTitle(this.activeTask)}</h3>
                        <p>${this.activeTask.stage ?? 'Processing...'}</p>
                      </ion-label>
                      ${this.isTaskActive(this.activeTask) ? (this.activeTask.cancellable ? html`
                        <ion-button slot="end" color="danger" size="small" fill="outline" @click=${() => this.cancelActiveTask()}>
                          Cancel
                        </ion-button>
                      ` : nothing) : html`
                        <ion-button slot="end" size="small" fill="outline" @click=${() => this.dismissActiveTask()}>
                          Dismiss
                        </ion-button>
                      `}
                    </ion-item>
                    ${this.isTaskActive(this.activeTask) ? html`
                      <ion-progress-bar class="ion-margin-top" .value=${(this.activeTask.progress ?? 0) / 100}></ion-progress-bar>
                    ` : nothing}
                  </ion-card-content>
                </ion-card>
              ` : nothing}
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Backup & Restore</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-note class="ion-display-block">
                    Creating a backup will save all current data to a backup file.
                    Restoring a backup will replace all current data with the data from the backup file; this is a destructive operation and cannot be undone.
                    These operations may take a while depending on the amount of data.
                  </ion-note>
                  <ion-list lines="full">
                    <ion-list-header>
                      <ion-label>Backups</ion-label>
                    </ion-list-header>
                    ${this.backups?.map(backup => html`
                      <ion-item-sliding key=${backup.metadata.name}>
                        <ion-item>
                          <ion-label>
                            ${backup.metadata.name}
                            <ion-note class="ion-display-block">Version: ${backup.metadata.version}</ion-note>
                          </ion-label>
                          <ion-note slot="end">
                            Size: ${scaleValue(backup.sizeInBytes, 1048576, 2)} MiB
                          </ion-note>
                        </ion-item>
                        <ion-item-options side="start" @ionSwipe=${() => this.onDeleteBackupClicked(backup)}>
                          <ion-item-option color="danger" .expandable=${true} @click=${() => this.onDeleteBackupClicked(backup)}>
                            <app-icon slot="start" name="delete"></app-icon>
                            Delete
                          </ion-item-option>
                        </ion-item-options>
                        <ion-item-options side="end">
                          <ion-item-option color="medium" @click=${() => this.onDownloadBackupClicked(backup)}>
                            <app-icon slot="start" name="download"></app-icon>
                            Download
                          </ion-item-option>
                          <ion-item-option color="secondary" @click=${() => this.onRestoreBackupClicked(backup)}>
                            <app-icon slot="start" name="settings_backup_restore"></app-icon>
                            Restore
                          </ion-item-option>
                        </ion-item-options>
                      </ion-item-sliding>
                    `)}
                  </ion-list>
                </ion-card-content>
                <ion-button fill="clear" @click=${() => this.createBackupClicked()}>
                  <app-icon slot="start" name="storage" size="small"></app-icon>
                  Backup Now
                </ion-button>
                <ion-button fill="clear" @click=${() => this.onUploadClicked()}>
                  <app-icon slot="start" name="upload" size="small"></app-icon>
                  Upload
                </ion-button>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    `;
  }

  private isTaskActive(task: Task): boolean {
    return task.state === TaskState.running;
  }

  private getTaskTitle(task: Task): string {
    let taskName: string;
    switch (task.type) {
      case 'backup':
        taskName = "Backup";
        break;
      case 'restore':
        taskName = "Restore";
        break;
      default:
        taskName = task.type;
        break;
    }

    switch (task.state) {
      case TaskState.completed:
        return `${taskName} Completed`
      case TaskState.failed:
        return `${taskName} Failed`
      case TaskState.cancelled:
        return `${taskName} Cancelled`
      default:
        return `${taskName} in Progress`
    }
  }

  private dismissActiveTask() {
    this.activeTask = undefined;
  }

  private async loadBackups() {
    try {
      const { data: backups, error } = await api.client.GET('/backups');

      if (error != null) {
        throw new Error('Failed to load backups.', { cause: error });
      }

      this.backups = backups ?? [];
    } catch (ex) {
      this.backups = [];
      console.error(ex);
    }
  }

  private async loadActiveTasks() {
    try {
      const { data, error } = await api.client.GET('/tasks', {
        params: {
          query: {
            states: [TaskState.running],
            types: ['backup', 'restore']
          }
        }
      });

      if (error == null && data != null && data.length > 0) {
        this.trackActiveTask(data[0]).catch(console.error);
      }
    } catch (ex) {
      console.warn('Failed to check active tasks', ex);
    }
  }

  private async trackActiveTask(initialTask: Task) {
    this.activeTask = initialTask;
    try {
      const finalTask = await pollTask(initialTask.id, {
        onUpdate: (task) => {
          this.activeTask = task;
        }
      });
      this.activeTask = finalTask;
      if (finalTask.state === TaskState.completed) {
        await this.loadBackups();
      } else if (finalTask.state === TaskState.failed) {
        await showToast(finalTask.error ?? 'Operation failed.');
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to monitor operation.');
    }
  }

  private async cancelActiveTask() {
    if (this.activeTask == null) return;
    try {
      const updated = await cancelTask(this.activeTask.id);
      this.activeTask = updated;
      await showToast('Operation cancelled.');
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to cancel operation.');
    }
  }

  private async createBackup() {
    try {
      const { data, error } = await api.client.POST('/backups', {
        body: {},
        bodySerializer(body) {
          return fileContentSerializer(body);
        }
      });

      if (error != null || data == null) {
        throw new Error('Failed to create backup.', { cause: error });
      }

      await this.trackActiveTask(data);
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to create backup.');
    }
  }

  private async createBackupClicked() {
    const { role } = await showAlert({
      header: 'Create Backup?',
      message: 'Are you sure you want to create a backup? This operation may take a while depending on the amount of data.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Create', role: 'confirm' }
      ],
    });

    if (role === 'confirm') {
      await this.createBackup();
    }
  }

  private async deleteBackup(backup: Backup) {
    try {
      await showLoading(
        async () => {
          const { error } = await api.client.DELETE('/backups/{name}', {
            params: { path: { name: backup.fileName } }
          });

          if (error != null) {
            throw new Error('Failed to delete backup.', { cause: error });
          }
        },
        'Deleting backup...'
      );
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete backup.');
    }
  }

  private async onDeleteBackupClicked(backup: Backup) {
    const { role } = await showAlert({
      header: 'Delete Backup?',
      message: 'Are you sure you want to delete this backup? This operation cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' }
      ],
    });

    if (role === 'destructive') {
      await this.deleteBackup(backup);
      await this.loadBackups();
    }
  }

  private async restoreBackup(backupFileName: string) {
    try {
      const { data, error } = await api.client.POST('/backups/{name}', {
        params: { path: { name: backupFileName } }
      });

      if (error != null || data == null) {
        throw new Error('Failed to restore from backup.', { cause: error });
      }

      await this.trackActiveTask(data);
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to restore from backup.');
    }
  }

  private async onRestoreBackupClicked(backup: Backup) {
    const { role } = await showAlert({
      header: 'Restore Backup?',
      message: 'Are you sure you want to restore this backup? This operation cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Restore', role: 'destructive' }
      ],
    });

    if (role === 'destructive') {
      await this.restoreBackup(backup.fileName);
    }
  }

  private async uploadBackup(file: File) {
    try {
      await showLoading(
        async () => {
          const { error } = await api.client.POST('/backups', {
            body: file,
            bodySerializer(body) {
              return fileContentSerializer(body, file);
            }
          });

          if (error != null) {
            throw new Error('Failed to upload backup.', { cause: error });
          }
        },
        'Uploading backup....'
      );
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to upload backup.');
    }
  }

  private async onUploadClicked() {
    const { data } = await showModal<{ file: File }>({
      presentingElement: this,
      component: 'file-upload-browser',
      componentProps: {
        heading: 'Upload Backup',
        label: 'Backup File',
        accept: 'application/zip,application/x-zip,application/x-zip-compressed,.zip',
      },
    });
    if (data != null) {
      await this.uploadBackup(data.file);
      await this.loadBackups();
    }
  }

  private onDownloadBackupClicked(backup: Backup) {
    const link = document.createElement('a');
    link.href = backup.fileUrl;
    link.download = backup.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
