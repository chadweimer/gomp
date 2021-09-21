import { Component, h } from '@stencil/core';
import '@ionic/core';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css'
})
export class RecipeEditor {

  render() {
    return (
      <ion-card>
        <ion-card-header>
          <ion-card-title>New Recipe</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-item>
            <ion-label position="floating">Name</ion-label>
            <ion-input />
          </ion-item>
          <ion-item>
            <ion-label position="floating">Serving Size</ion-label>
            <ion-input />
          </ion-item>
          <ion-item>
            <ion-label position=floating">Ingredients</ion-label>
            <ion-textarea auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="floating">Directions</ion-label>
            <ion-textarea auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="floating">Storage/Freezer Instructions</ion-label>
            <ion-textarea auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="floating">Nutrition</ion-label>
            <ion-textarea auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="floating">Source</ion-label>
            <ion-input type="url" />
          </ion-item>
        </ion-card-content>
        <ion-footer>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary">Save</ion-button>
            </ion-buttons>
            <ion-buttons slot="secondary">
              <ion-button color="danger">Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-footer>
      </ion-card>
    );
  }

}
