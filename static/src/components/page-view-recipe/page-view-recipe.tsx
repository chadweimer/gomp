import { actionSheetController, alertController } from '@ionic/core';
import { Component, Element, h, Prop, State } from '@stencil/core';
import { RecipesApi } from '../../helpers/api';
import { Recipe, RecipeImage } from '../../models';

@Component({
  tag: 'page-view-recipe',
  styleUrl: 'page-view-recipe.css'
})
export class PageViewRecipe {
  @Prop() recipeId: number;

  @State() recipe: Recipe | null;
  @State() mainImage: RecipeImage | null;
  @State() images: RecipeImage[] = [];

  @Element() el: HTMLPageViewRecipeElement;

  async connectedCallback() {
    await this.loadRecipe();
    await this.loadImages();
  }

  render() {
    return [
      <ion-header class="ion-hide-lg-down">
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button>
              <ion-icon slot="start" icon="create" />
              Edit
            </ion-button>
            <ion-button>
              <ion-icon slot="start" icon="chatbox" />
              Add Note
            </ion-button>
            <ion-button class="ion-hide-sm-down">
              <ion-icon slot="start" icon="camera" />
              Upload Picture
            </ion-button>
            <ion-button>
              <ion-icon slot="start" icon="link" />
              Add Link
            </ion-button>
          </ion-buttons>
          <ion-buttons slot="secondary">
            <ion-button onClick={() => this.onDeleteClicked()}>
              <ion-icon slot="start" icon="trash" />
              Delete
            </ion-button>
            <ion-button>
              <ion-icon slot="start" icon="archive" />
              Archive
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <ion-grid class="no-pad">
          <ion-row class="ion-justify-content-center">
            <ion-col size-xs="12" size-sm="12" size-md="10" size-lg="10" size-xl="8">
              <ion-card>
                <ion-card-content>
                  <ion-item lines="none">
                    <ion-avatar slot="start">
                      <img src={this.mainImage?.thumbnailUrl} />
                    </ion-avatar>
                    <h2>{this.recipe?.name}</h2>
                  </ion-item>
                  {this.recipe?.servingSize ?
                    <ion-item lines="full">
                      <ion-label position="stacked">Serving Size</ion-label>
                      <p class="plain ion-padding">{this.recipe?.servingSize}</p>
                    </ion-item>
                    : ''}
                  {this.recipe?.ingredients ?
                    <ion-item lines="full">
                      <ion-label position="stacked">Ingredients</ion-label>
                      <p class="plain ion-padding">{this.recipe?.ingredients}</p>
                    </ion-item>
                    : ''}
                  {this.recipe?.directions ?
                    <ion-item lines="full">
                      <ion-label position="stacked">Directions</ion-label>
                      <p class="plain ion-padding">{this.recipe?.directions}</p>
                    </ion-item>
                    : ''}
                  {this.recipe?.storageInstructions ?
                    <ion-item lines="full">
                      <ion-label position="stacked">Storage/Freezer Instructions</ion-label>
                      <p class="plain ion-padding">{this.recipe?.storageInstructions}</p>
                    </ion-item>
                    : ''}
                  {this.recipe?.nutritionInfo ?
                    <ion-item lines="full">
                      <ion-label position="stacked">Nutrition</ion-label>
                      <p class="plain ion-padding">{this.recipe?.nutritionInfo}</p>
                    </ion-item>
                    : ''}
                  {this.recipe?.sourceUrl ?
                    <ion-item lines="full">
                      <ion-label position="stacked">Source</ion-label>
                      <p class="plain ion-padding">{this.recipe?.sourceUrl}</p>
                    </ion-item>
                    : ''}
                </ion-card-content>
              </ion-card>
              <ion-grid>
                <ion-row>
                  <ion-col class="ion-padding-horizontal" size-xs="12" size-sm="12" size-md="6" size-lg="6" size-xl="6">
                    <h4 class="tab ion-text-center"><ion-text color="primary">Pictures</ion-text></h4>
                    <ion-grid>
                      <ion-row>
                        {this.images.map(image =>
                          <ion-col>
                            <a href={image.url} target="_blank">
                              <ion-thumbnail class="large">
                                <ion-img src={image.thumbnailUrl} alt={image.name} />
                              </ion-thumbnail>
                            </a>
                          </ion-col>
                        )}
                      </ion-row>
                    </ion-grid>
                  </ion-col>
                  <ion-col class="ion-padding-horizontal" size-xs="12" size-sm="12" size-md="6" size-lg="6" size-xl="6">
                    <h4 class="tab ion-text-center"><ion-text color="primary">Notes</ion-text></h4>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>,

      <ion-footer class="ion-hide-lg-up">
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button>
              <ion-icon slot="start" icon="create" />
              Edit
            </ion-button>
            <ion-button>
              <ion-icon slot="start" icon="chatbox" />
              Add Note
            </ion-button>
            <ion-button class="ion-hide-sm-down">
              <ion-icon slot="start" icon="camera" />
              Upload Picture
            </ion-button>
            <ion-button onClick={() => this.showRecipeMenu()}>
              <ion-icon slot="icon-only" ios="ellipsis-horizontal" md="ellipsis-vertical"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-buttons slot="secondary">
            <ion-button class="ion-hide-md-down" onClick={() => this.onDeleteClicked()}>
              <ion-icon slot="start" icon="trash" />
              Delete
            </ion-button>
            <ion-button class="ion-hide-sm-down">
              <ion-icon slot="start" icon="archive" />
              Archive
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    ];
  }

  private async loadRecipe() {
    try {
      const { recipe, mainImage } = await RecipesApi.get(this.el, this.recipeId);
      this.recipe = recipe;
      this.mainImage = mainImage;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async loadImages() {
    try {
      this.images = await RecipesApi.getImages(this.el, this.recipeId);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async deleteRecipe() {
    try {
      await RecipesApi.delete(this.el, this.recipeId);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async showRecipeMenu() {
    const menu = await actionSheetController.create({
      header: 'Menu',
      buttons: [
        {
          text: 'Delete',
          icon: 'trash',
          role: 'destructive',
          handler: async () => {
            await this.onDeleteClicked();
            return true;
          }
        },
        { text: 'Archive', icon: 'archive', role: 'destructive' },
        { text: 'Add Link', icon: 'link' },
        { text: 'Edit', icon: 'create' },
        { text: 'Add Note', icon: 'chatbox' },
        { text: 'Upload Picture', icon: 'camera' },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ]
    });
    await menu.present();
  }

  private async onDeleteClicked() {
    const confirmation = await alertController.create({
      header: 'Delete Recipe?',
      message: 'Are you sure you want to delete this recipe?',
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.deleteRecipe();
            return true;
          }
        }
      ]
    });

    await confirmation.present();

    // TODO: Redirect
  }
}
