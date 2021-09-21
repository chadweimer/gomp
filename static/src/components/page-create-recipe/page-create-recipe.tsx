import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-create-recipe',
  styleUrl: 'page-create-recipe.css'
})
export class PageCreateRecipe {

  render() {
    return (
      <ion-content>
        <ion-grid>
          <ion-row class="ion-justify-content-center">
            <ion-col size-xs="12" size-sm="12" size-md="10" size-lg="8" size-xl="6">
              <recipe-editor />
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    );
  }

}
