import { Component, Element, Host, Method, State, h } from '@stencil/core';
import { Backup } from '../../../helpers/schema.gen';
import { api, fileContentSerializer } from '../../../helpers/api';
import { showAlert, showLoading, showModal, showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, isNull, scaleValue } from '../../../helpers/utils';

@Component({
  tag: 'page-admin-maintenance',
  styleUrl: 'page-admin-maintenance.css',
})
export class PageAdminMaintenance implements ComponentWithActivatedCallback {
  @Element() el!: HTMLPageAdminMaintenanceElement;

  @State() backups: Backup[] = [];

  @Method()
  async activatedCallback() {
    await this.loadBackups();
  }

  render() {
    return (
      <Host>
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
                      {this.backups?.map(backup =>
                        <ion-item-sliding key={backup.metadata.name}>
                          <ion-item>
                            <ion-label>
                              {backup.metadata.name}
                              <ion-note class="ion-display-block">Version: {backup.metadata.version}</ion-note>
                            </ion-label>
                            <ion-note slot="end">
                              Size: {scaleValue(backup.sizeInBytes, 1048576, 2)} MiB
                            </ion-note>
                          </ion-item>
                          <ion-item-options side="start" onIonSwipe={() => this.onDeleteBackupClicked(backup)}>
                            <ion-item-option color="danger" expandable={true} onClick={() => this.onDeleteBackupClicked(backup)}>
                              <ion-icon slot="top" name="trash" />
                              Delete
                            </ion-item-option>
                          </ion-item-options>
                          <ion-item-options side="end">
                            <ion-item-option color="primary" onClick={() => this.onDownloadBackupClicked(backup)}>
                              <ion-icon slot="top" name="download-outline" />
                              Download
                            </ion-item-option>
                            <ion-item-option color="warning" onClick={() => this.onRestoreBackupClicked(backup)}>
                              <ion-icon slot="top" name="open-outline" />
                              Restore
                            </ion-item-option>
                          </ion-item-options>
                        </ion-item-sliding>
                      )}
                    </ion-list>
                  </ion-card-content>
                  <ion-button fill="clear" onClick={() => this.createBackupClicked()}>
                    <ion-icon slot="start" name="server" />
                    Backup Now
                  </ion-button>
                  <ion-button fill="clear" onClick={() => this.onUploadClicked()}>
                    <ion-icon slot="start" name="open-outline" />
                    Upload
                  </ion-button>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
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
              return fileContentSerializer(body)
            }
          });

          if (error) {
            throw new Error('Failed to create backup.', { cause: error });
          }
        }, 'Creating backup...');
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
        { text: 'No', role: 'cancel' },
        { text: 'Yes', role: 'confirm' }
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
            throw new Error('Failed to delete backup.', { cause: error })
          }
        }, 'Deleting backup...');
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
        { text: 'No', role: 'cancel' },
        { text: 'Yes', role: 'confirm' }
      ],
    });

    if (role === 'confirm') {
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
            throw new Error('Failed to restore from backup.', { cause: error })
          }
        }, 'Restoring backup...');
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
        { text: 'No', role: 'cancel' },
        { text: 'Yes', role: 'confirm' }
      ],
    });

    if (role === 'confirm') {
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
              return fileContentSerializer(body, file)
            }
          });

          if (error) {
            throw new Error('Failed to upload backup.', { cause: error })
          }
        }, 'Uploading backup....');
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to upload backup.');
    }
  }

  private async onUploadClicked() {
    const { data } = await showModal<{ file: File }>({
      presentingElement: this.el,
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
    // Programmatically start the download
    const link = document.createElement('a');
    link.href = backup.fileUrl;
    link.download = backup.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
