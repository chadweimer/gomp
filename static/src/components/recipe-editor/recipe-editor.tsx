import { Component, h } from '@stencil/core';
import '@ionic/core';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css'
})
export class RecipeEditor {

  render() {
    return (
      <ion-card class="container-wide">
        <ion-card-header>
          <ion-card-title>New Recipe</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-item>
            <ion-label position="floating">Name</ion-label>
            <ion-input></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="floating">Serving Size</ion-label>
            <ion-input></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="floating">Ingredients</ion-label>
            <ion-input></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="floating">Directions</ion-label>
            <ion-input></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="floating">Storage/Freezer Instructions</ion-label>
            <ion-input></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="floating">Nutrition</ion-label>
            <ion-input></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="floating">Source</ion-label>
            <ion-input></ion-input>
          </ion-item>
        </ion-card-content>
        <ion-item>
          <ion-button slot="start" fill="clear" size="default">Cancel</ion-button>
          <ion-button slot="start" fill="clear" size="default">Save</ion-button>
        </ion-item>
      </ion-card>
    );
  }

}
