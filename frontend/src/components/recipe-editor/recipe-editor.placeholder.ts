import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { modalController } from '@ionic/core';
import { Recipe } from '../../helpers/schema.gen';

@customElement('recipe-editor')
export class RecipeEditorPlaceholder extends LitElement {
  @property({ type: Object }) recipe?: Recipe;

  protected createRenderRoot() {
    return this;
  }

  private async dismiss(data?: { recipe: Recipe; file: File | null }) {
    await modalController.dismiss(data);
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar>
          <ion-title>New Recipe (Placeholder)</ion-title>
          <ion-buttons slot="end">
            <ion-button @click=${() => this.dismiss()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <p>Recipe Editor placeholder (Phase 3)</p>
      </ion-content>
    `;
  }
}

