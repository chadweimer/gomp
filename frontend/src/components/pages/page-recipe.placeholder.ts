import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('page-recipe')
export class PageRecipePlaceholder extends LitElement {
  @property({ type: Number }) recipeId?: number;

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="ion-page">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-buttons slot="start">
              <ion-back-button defaultHref="/recipes"></ion-back-button>
            </ion-buttons>
            <ion-title>Recipe ${this.recipeId ?? ''} (Placeholder)</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <h2>Recipe Detail Placeholder</h2>
          <p>Recipe ID: ${this.recipeId ?? 'Not specified'}</p>
          <ion-button routerLink="/recipes" fill="outline">Back to Recipes</ion-button>
        </ion-content>
      </div>
    `;
  }
}

