import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('page-tags')
export class PageTagsPlaceholder extends LitElement {
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
            <ion-title>Tags (Placeholder)</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <h2>Tags Overview</h2>
          <p>Phase 1 Placeholder: Tags</p>
        </ion-content>
      </div>
    `;
  }
}

