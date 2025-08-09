import { alertController } from '@ionic/core';
import { Component, Host, h } from '@stencil/core';
import { RecipeState, SortBy, SortDir } from '../../../generated';
import { performRecipeSearch, appApi, recipesApi } from '../../../helpers/api';
import { enableBackForOverlay, showLoading, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-admin-maintenance',
  styleUrl: 'page-admin-maintenance.css',
})
export class PageAdminMaintenance {
  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad" fixed>
            <ion-row>
              <ion-col>
                <ion-card>
                  <ion-card-content>
                    <ion-button color="danger" fill="solid" onClick={() => this.optimizeImagesClicked()}>Optimize All Images</ion-button>
                    <p>
                      <ion-note>
                        Optimizing images will load and re-save all uploaded recipe images using the latest configured settings,
                        including regenerating thumbnails. If this was already run and the settings have not changed, it will have no effect.
                      </ion-note>
                    </p>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col>
                <ion-card>
                  <ion-card-content>
                    <ion-button color="danger" fill="solid" onClick={() => this.createBackupClicked()}>Create Backup</ion-button>
                    <p>
                      <ion-note>
                        Creating a backup will save all current data to a backup file. This operation cannot be undone.
                      </ion-note>
                    </p>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
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
          for (const recipe of recipes) {
            const images = await recipesApi.getImages({ recipeId: recipe.id });
            for (const image of images) {
              await recipesApi.optimizeImage({
                recipeId: recipe.id,
                imageId: image.id
              });
            }
          }
        }, 'Optimizing images. This might take a while...');
    } catch (ex) {
      console.error(ex);
      showToast('Failed to optimize images.');
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
        async () => appApi.createBackup(), 'Creating backup...');
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create backup.');
    }
  }

  private async createBackupClicked() {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Create Backup?',
        message: 'Are you sure you want to create a backup? This operation cannot be undone.',
        buttons: [
          'No',
          {
            text: 'Yes',
            handler: async () => {
              await this.createBackup();
              return true;
            }
          }
        ],
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

}
