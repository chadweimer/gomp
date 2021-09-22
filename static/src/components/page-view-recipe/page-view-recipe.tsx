import { Component, Element, h, Prop, State } from '@stencil/core';
import { ajaxGetWithResult } from '../../helpers/ajax';
import { Recipe } from '../../models';

@Component({
  tag: 'page-view-recipe',
  styleUrl: 'page-view-recipe.css'
})
export class PageViewRecipe {
  @Prop() recipeId: number;

  @State() recipe: Recipe | null;

  @Element() el: HTMLElement;

  async connectedCallback() {
    await this.loadRecipe();
  }

  render() {
    return (
      <ion-content>
        <ion-grid class="no-pad">
          <ion-row class="ion-justify-content-center">
            <ion-col size-xs="12" size-sm="12" size-md="10" size-lg="8" size-xl="6">
              <ion-card>
                <ion-card-content>
                  <h2>{this.recipe?.name}</h2>
                  <ion-item lines="full">
                    <ion-label position="stacked">Serving Size</ion-label>
                    <p class="plain ion-padding">{this.recipe?.servingSize}</p>
                  </ion-item>
                  <ion-item lines="full">
                    <ion-label position="stacked">Ingredients</ion-label>
                    <p class="plain ion-padding">{this.recipe?.ingredients}</p>
                  </ion-item>
                  <ion-item lines="full">
                    <ion-label position="stacked">Directions</ion-label>
                    <p class="plain ion-padding">{this.recipe?.directions}</p>
                  </ion-item>
                  <ion-item lines="full">
                    <ion-label position="stacked">Storage/Freezer Instructions</ion-label>
                    <p class="plain ion-padding">{this.recipe?.storageInstructions}</p>
                  </ion-item>
                  <ion-item lines="full">
                    <ion-label position="stacked">Nutrition</ion-label>
                    <p class="plain ion-padding">{this.recipe?.nutritionInfo}</p>
                  </ion-item>
                  <ion-item lines="full">
                    <ion-label position="stacked">Source</ion-label>
                    <p class="plain ion-padding">{this.recipe?.sourceUrl}</p>
                  </ion-item>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    );
  }

  async loadRecipe() {
    try {
      this.recipe = await ajaxGetWithResult(this.el, `/api/v1/recipes/${this.recipeId}`);
    } catch (ex) {
      console.error(ex);
    }
  }

}
