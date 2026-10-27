import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('page-home')
export class PageHomePlaceholder extends LitElement {
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
            <ion-title>Home (Placeholder)</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <h2>Welcome to GOMP</h2>
          <p>Phase 1 Placeholder: Home Page</p>
          <ion-button routerLink="/recipes" fill="solid">Go to Recipes</ion-button>
          <ion-button routerLink="/tags" fill="outline">Go to Tags</ion-button>
        </ion-content>
      </div>
    `;
  }
}

