import { actionSheetController, alertController } from '@ionic/core';
import { Component, Element, h, Prop, State } from '@stencil/core';
import { ajaxDelete, ajaxGetWithResult } from '../../helpers/ajax';
import { Recipe, RecipeImage } from '../../models';

@Component({
  tag: 'page-view-recipe',
  styleUrl: 'page-view-recipe.css'
})
export class PageViewRecipe {
  @Prop() recipeId: number;

  @State() recipe: Recipe | null;
  @State() mainImage: RecipeImage | null;

  @Element() el: HTMLPageViewRecipeElement;

  async connectedCallback() {
    await this.loadRecipe();
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
            <ion-col size-xs="12" size-sm="12" size-md="10" size-lg="8" size-xl="6">
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
      this.recipe = await ajaxGetWithResult(this.el, `/api/v1/recipes/${this.recipeId}`);
      this.mainImage = await ajaxGetWithResult(this.el, `/api/v1/recipes/${this.recipeId}/image`);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async deleteRecipe() {
    try {
      await ajaxDelete(this.el, `/api/v1/recipes/${this.recipeId}`);
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
