import { alertController } from '@ionic/core';
import { Component, Host, h } from '@stencil/core';
import { RecipeState, SortBy, SortDir } from '../../../generated';
import { performRecipeSearch, recipesApi } from '../../../helpers/api';
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
                    <ion-item lines="full">
                      <ion-buttons>
                        <ion-button color="danger" fill="solid" onClick={() => this.optimizeImagesClicked()}>Optimize All Images</ion-button>
                      </ion-buttons>
                      <ion-note slot="helper">
                        Optimizing images will load and re-save all uploaded recipe images using the latest configured settings,
                        including regenerating thumbnails. If this was already run and the settings have not changed, it will have no effect.
                      </ion-note>
                    </ion-item>
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
        animated: false,
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

}
