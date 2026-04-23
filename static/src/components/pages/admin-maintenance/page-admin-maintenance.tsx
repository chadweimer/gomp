import { alertController, modalController } from '@ionic/core';
import { Component, Host, Method, State, h } from '@stencil/core';
import { Backup, RecipeState, SortBy, SortDir } from '../../../generated';
import { performRecipeSearch, appApi, recipesApi } from '../../../helpers/api';
import { ComponentWithActivatedCallback, enableBackForOverlay, isNull, showLoading, showToast } from '../../../helpers/utils';

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
                  <ion-button size="small" fill="clear" onClick={() => this.optimizeImagesClicked()}>
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
                        Creating a backup will save all current data to a backup file. This operation may take a while depending on the amount of data.
                      </ion-note>
                    </p>
                    <ion-list lines="full">
                      <ion-list-header>
                        <ion-label>Backups</ion-label>
                      </ion-list-header>
                      {this.backups?.map(backup =>
                        <ion-item key={backup.name}>
                          <ion-label>{backup.name}</ion-label>
                          <ion-button slot="end" size="small" fill="clear">
                            <ion-icon slot="start" name="open-outline" />
                            Restore
                          </ion-button>
                          <ion-button slot="end" size="small" fill="clear">
                            <ion-icon slot="start" name="download-outline" />
                            <a class="no-style" href={backup.url} download={backup.name}>Download</a>
                          </ion-button>
                          <ion-button slot="end" size="small" fill="clear" color="danger" onClick={() => this.onDeleteBackupClicked(backup)}>
                            <ion-icon slot="start" name="trash" />
                            Delete
                          </ion-button>
                        </ion-item>
                      )}
                    </ion-list>
                  </ion-card-content>
                  <ion-button size="small" fill="clear" onClick={() => this.createBackupClicked()}>
                    <ion-icon slot="start" name="server" />
                    Backup Now
                  </ion-button>
                  <ion-button size="small" fill="clear" onClick={() => this.onUploadAndRestoreClicked()}>
                    <ion-icon slot="start" name="open-outline" />
                    Upload & Restore
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
      this.backups = await appApi.getAllBackups();
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
        async () => await appApi.deleteBackup({ name: backup.name }), 'Deleting backup...');
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

  private async onUploadAndRestoreClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'file-upload-browser',
        componentProps: {
          heading: 'Upload & Restore Backup',
          label: 'Backup File',
          accept: 'application/zip,application/x-zip,application/x-zip-compressed,.zip',
        },
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ file: File }>();
      if (!isNull(data)) {
        // await this.uploadAndRestoreBackup(data.file);

        // Update the list of backups
        await this.loadBackups();
      }
    });
  }
}
