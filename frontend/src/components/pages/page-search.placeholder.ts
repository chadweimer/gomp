import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('page-search')
export class PageSearchPlaceholder extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="ion-page">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-buttons slot="start">
              <ion-menu-button></ion-menu-button>
            </ion-buttons>
            <ion-title>Recipes (Placeholder)</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <h2>Recipe Search & Listing</h2>
          <p>Phase 1 Placeholder: Search</p>
          <ion-list>
            <ion-item routerLink="/recipes/1" button>
              <ion-label>Sample Recipe #1</ion-label>
            </ion-item>
            <ion-item routerLink="/recipes/2" button>
              <ion-label>Sample Recipe #2</ion-label>
            </ion-item>
          </ion-list>
        </ion-content>
      </div>
    `;
  }
}

