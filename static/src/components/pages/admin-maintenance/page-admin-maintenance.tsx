import { actionSheetController, alertController, modalController } from '@ionic/core';
import { Component, Host, Method, State, h } from '@stencil/core';
import { Backup, RecipeState, SortBy, SortDir } from '../../../generated';
import { performRecipeSearch, appApi, recipesApi } from '../../../helpers/api';
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
                    <ion-card-title>Image Optimization</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p>
                      <ion-note>
                        Optimizing images will load and re-save all uploaded recipe images using the latest configured settings,
                        including regenerating thumbnails. If this was already run and the settings have not changed, it will have no effect.
                      </ion-note>
                    </p>
                  </ion-card-content>
                  <ion-button fill="clear" onClick={() => this.optimizeImagesClicked()}>
                    <ion-icon slot="start" name="sparkles" />
                    Optimize All
                  </ion-button>
                </ion-card>
              </ion-col>
            </ion-row>
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
                            <p>{scaleValue(backup.sizeInBytes, 1048576, 2)} MiB</p>
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
      this.backups = await appApi.getBackups();
    } catch (ex) {
      this.backups = [];
      console.error(ex);
    }
  }

  private async optimizeImages() {
    try {
      await showLoading(
        async () => {
          const { recipes } = await performRecipeSearch({
            sortBy: SortBy.Id,
            sortDir: SortDir.Asc,
            query: '',
            withPictures: true,
            fields: [],
            states: [RecipeState.Active, RecipeState.Archived],
            tags: []
          }, 1, -1,);
          for (const recipe of recipes ?? []) {
            if (isNull(recipe.id)) continue;

            const images = await recipesApi.getImages({ recipeId: recipe.id });
            for (const image of images) {
              if (isNull(image.id)) continue;

              await recipesApi.optimizeImage({
                recipeId: recipe.id,
                imageId: image.id
              });
            }
          }
        }, 'Optimizing images. This might take a while...');
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to optimize images.');
    }
  }

  private async optimizeImagesClicked() {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Optimize All Images?',
        message: 'Are you sure you want to optimize all images? This operation cannot be undone.',
        buttons: [
          'No',
          {
            text: 'Yes',
            handler: async () => {
              await this.optimizeImages();
              return true;
            }
          }
        ],
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

  private async createBackup() {
    try {
      await showLoading(
        async () => await appApi.createBackup(), 'Creating backup...');
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
          'No',
          {
            text: 'Yes',
            handler: async () => {
              await this.createBackup();
              await this.loadBackups();
              return true;
            }
          }
        ],
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

  private async deleteBackup(backup: Backup) {
    try {
      await showLoading(
        async () => await appApi.deleteBackup({ fileName: backup.fileName }), 'Deleting backup...');
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
          'No',
          {
            text: 'Yes',
            handler: async () => {
              await this.deleteBackup(backup);
              await this.loadBackups();
              return true;
            }
          }
        ],
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

  private async restoreBackup(backupFileName: string) {
    try {
      await showLoading(
        async () => await appApi.restoreFromBackup({ fileName: backupFileName }), 'Restoring backup...');
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
          'No',
          {
            text: 'Yes',
            handler: async () => {
              await this.restoreBackup(backup.fileName);
              await this.loadBackups();
              return true;
            }
          }
        ],
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

  private async uploadBackup(file: File) {
    try {
      await showLoading(
        async () => await appApi.createBackup({ fileContent: file }), 'Uploading backup....');
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
        {
          text: 'Delete',
          icon: 'trash',
          role: 'destructive',
          handler: () => this.onDeleteBackupClicked(backup),
        },
        {
          text: 'Download',
          icon: 'download-outline',
          handler: () => this.onDownloadBackupClicked(backup)
        },
        {
          text: 'Restore',
          icon: 'open-outline',
          handler: () => this.onRestoreBackupClicked(backup)
        },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ],
    });
    await menu.present();

    await menu.onDidDismiss();
  }
}
