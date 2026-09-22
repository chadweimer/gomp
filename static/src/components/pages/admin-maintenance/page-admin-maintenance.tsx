import { actionSheetController, alertController, modalController } from '@ionic/core';
import { Component, Host, Method, State, h } from '@stencil/core';
import { Backup } from '../../../api/schema.gen';
import { apiClient } from '../../../helpers/api';
import { ComponentWithActivatedCallback, enableBackForOverlay, isNull, scaleValue, showLoading, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-admin-maintenance',
  styleUrl: 'page-admin-maintenance.css',
})
export class PageAdminMaintenance implements ComponentWithActivatedCallback {
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
                    <p>
                      <ion-note>
                        Creating a backup will save all current data to a backup file.
                        Restoring a backup will replace all current data with the data from the backup file; this is a destructive operation and cannot be undone.
                        These operations may take a while depending on the amount of data.
                      </ion-note>
                    </p>
                    <ion-list lines="full">
                      <ion-list-header>
                        <ion-label>Backups</ion-label>
                      </ion-list-header>
                      {this.backups?.map(backup =>
                        <ion-item key={backup.metadata.name}>
                          <ion-label>
                            <h2>{backup.metadata.name}</h2>
                            <p>Version: {backup.metadata.version}</p>
                            <p>Size: {scaleValue(backup.sizeInBytes, 1048576, 2)} MiB</p>
                          </ion-label>
                          <ion-button class="ion-hide-lg-down" slot="end" fill="clear" onClick={() => this.onRestoreBackupClicked(backup)}>
                            <ion-icon slot="start" name="open-outline" />
                            Restore
                          </ion-button>
                          <ion-button class="ion-hide-lg-down" slot="end" fill="clear" onClick={() => this.onDownloadBackupClicked(backup)}>
                            <ion-icon slot="start" name="download-outline" />
                            Download
                          </ion-button>
                          <ion-button class="ion-hide-lg-down" slot="end" fill="clear" color="danger" onClick={() => this.onDeleteBackupClicked(backup)}>
                            <ion-icon slot="start" name="trash" />
                            Delete
                          </ion-button>
                          <ion-button class="ion-hide-lg-up" slot="end" color="dark" fill="clear" onClick={() => this.onBackupMenuClicked(backup)}>
                            <ion-icon slot="icon-only" ios="ellipsis-horizontal" md="ellipsis-vertical" />
                          </ion-button>
                        </ion-item>
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
      const { data: backups, error } = await apiClient.GET('/backups');

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
          const { error } = await apiClient.POST('/backups');

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
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Create Backup?',
        message: 'Are you sure you want to create a backup? This operation may take a while depending on the amount of data.',
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.createBackup();
        await this.loadBackups();
      }
    });
  }

  private async deleteBackup(backup: Backup) {
    try {
      await showLoading(
        async () => {
          const { error } = await apiClient.DELETE('/backups/{name}', {
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
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Delete Backup?',
        message: 'Are you sure you want to delete this backup? This operation cannot be undone.',
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.deleteBackup(backup);
        await this.loadBackups();
      }
    });
  }

  private async restoreBackup(backupFileName: string) {
    try {
      await showLoading(
        async () => {
          const { error } = await apiClient.POST('/backups/{name}', {
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
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Restore Backup?',
        message: 'Are you sure you want to restore this backup? This operation cannot be undone.',
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.restoreBackup(backup.fileName);
        await this.loadBackups();
      }
    });
  }

  private async uploadBackup(file: File) {
    try {
      await showLoading(
        async () => {
          const { error } = await apiClient.POST('/backups', {
            body: { fileContent: file }
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
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'file-upload-browser',
        componentProps: {
          heading: 'Upload Backup',
          label: 'Backup File',
          accept: 'application/zip,application/x-zip,application/x-zip-compressed,.zip',
        },
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ file: File }>();
      if (!isNull(data)) {
        await this.uploadBackup(data.file);
        await this.loadBackups();
      }
    });
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

  private async onBackupMenuClicked(backup: Backup) {
    const menu = await actionSheetController.create({
      header: backup.metadata.name,
      buttons: [
        { text: 'Delete', icon: 'trash', role: 'destructive' },
        { text: 'Download', icon: 'download-outline', role: 'download' },
        { text: 'Restore', icon: 'open-outline', role: 'restore' },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ],
    });
    await menu.present();

    const { role } = await menu.onDidDismiss();

    switch (role) {
      case 'destructive':
        await this.onDeleteBackupClicked(backup);
        break;
      case 'download':
        this.onDownloadBackupClicked(backup);
        break;
      case 'restore':
        await this.onRestoreBackupClicked(backup);
        break;
    }
  }
}
