import { Component, Element, h } from '@stencil/core';
import '@ionic/core';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css'
})
export class RecipeEditor {

  @Element() el: HTMLElement;

  render() {
    return [
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button>Save</ion-button>
          </ion-buttons>
          <ion-title>New Recipe</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <ion-item>
          <ion-label position="floating">Name</ion-label>
          <ion-input />
        </ion-item>
        <ion-item lines="full">
          <ion-label position="stacked">Picture</ion-label>
          <form id="mainImageForm" enctype="multipart/form-data">
            <input id="mainImage" name="file_content" type="file" accept=".jpg,.jpeg,.png" class="padded-input" />
          </form>
        </ion-item>
        <ion-item>
          <ion-label position="floating">Serving Size</ion-label>
          <ion-input />
        </ion-item>
        <ion-item>
          <ion-label position="floating">Ingredients</ion-label>
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
      </ion-content>
    ];
  }

  onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      'dismissed': true
    });
  }

}
