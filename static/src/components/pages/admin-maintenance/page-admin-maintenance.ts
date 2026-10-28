import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Backup } from '../../../helpers/schema.gen';
import { api, fileContentSerializer } from '../../../helpers/api';
import { showAlert, showLoading, showModal, showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, isNull, scaleValue } from '../../../helpers/utils';
import '../../file-upload-browser/file-upload-browser';
import './page-admin-maintenance.css';

@customElement('page-admin-maintenance')
export class PageAdminMaintenance extends LitElement implements ComponentWithActivatedCallback {
  @state() backups: Backup[] = [];

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activatedCallback().catch(console.error);
  }

  async activatedCallback() {
    await this.loadBackups();
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad" fixed>
          <ion-row>
            <ion-col>
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
                            <ion-icon slot="start" name="trash"></ion-icon>
                            Delete
                          </ion-item-option>
                        </ion-item-options>
                        <ion-item-options side="end">
                          <ion-item-option color="medium" @click=${() => this.onDownloadBackupClicked(backup)}>
                            <ion-icon slot="start" name="download"></ion-icon>
                            Download
                          </ion-item-option>
                          <ion-item-option color="secondary" @click=${() => this.onRestoreBackupClicked(backup)}>
                            <ion-icon slot="start" name="open"></ion-icon>
                            Restore
                          </ion-item-option>
                        </ion-item-options>
                      </ion-item-sliding>
                    `)}
                  </ion-list>
                </ion-card-content>
                <ion-button fill="clear" @click=${() => this.createBackupClicked()}>
                  <ion-icon slot="start" name="server"></ion-icon>
                  Backup Now
                </ion-button>
                <ion-button fill="clear" @click=${() => this.onUploadClicked()}>
                  <ion-icon slot="start" name="open-outline"></ion-icon>
                  Upload
                </ion-button>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    `;
  }

  private async loadBackups() {
    try {
      const { data: backups, error } = await api.client.GET('/backups');

      if (error) {
        throw new Error('Failed to load backups.', { cause: error });
      }

      this.backups = backups ?? [];
    } catch (ex) {
      this.backups = [];
      console.error(ex);
    }
  }

  private async createBackup() {
    try {
      await showLoading(
        async () => {
          const { error } = await api.client.POST('/backups', {
            body: {},
            bodySerializer(body) {
              return fileContentSerializer(body);
            }
          });

          if (error) {
            throw new Error('Failed to create backup.', { cause: error });
          }
        },
        'Creating backup...'
      );
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
      await this.loadBackups();
    }
  }

  private async deleteBackup(backup: Backup) {
    try {
      await showLoading(
        async () => {
          const { error } = await api.client.DELETE('/backups/{name}', {
            params: { path: { name: backup.fileName } }
          });

          if (error) {
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
      await showLoading(
        async () => {
          const { error } = await api.client.POST('/backups/{name}', {
            params: { path: { name: backupFileName } }
          });

          if (error) {
            throw new Error('Failed to restore from backup.', { cause: error });
          }
        },
        'Restoring backup...'
      );
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
      await this.loadBackups();
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

          if (error) {
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
    if (!isNull(data)) {
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

