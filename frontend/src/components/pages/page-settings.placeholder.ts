import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('tab-settings-preferences')
export class TabSettingsPreferencesPlaceholder extends LitElement {
  createRenderRoot() { return this; }
  render() {
    return html`
      <div class="ion-page">
        <ion-content class="ion-padding">
          <h3>Preferences Placeholder</h3>
        </ion-content>
      </div>
    `;
  }
}

@customElement('tab-settings-searches')
export class TabSettingsSearchesPlaceholder extends LitElement {
  createRenderRoot() { return this; }
  render() {
    return html`
      <div class="ion-page">
        <ion-content class="ion-padding">
          <h3>Saved Searches Placeholder</h3>
        </ion-content>
      </div>
    `;
  }
}

@customElement('tab-settings-security')
export class TabSettingsSecurityPlaceholder extends LitElement {
  createRenderRoot() { return this; }
  render() {
    return html`
      <div class="ion-page">
        <ion-content class="ion-padding">
          <h3>Security Settings Placeholder</h3>
        </ion-content>
      </div>
    `;
  }
}

@customElement('page-settings')
export class PageSettingsPlaceholder extends LitElement {
  createRenderRoot() { return this; }

  render() {
    return html`
      <div class="ion-page">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-buttons slot="start">
              <ion-menu-button></ion-menu-button>
            </ion-buttons>
            <ion-title>Settings (Placeholder)</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-tabs>
          <ion-tab tab="tab-settings-preferences" component="tab-settings-preferences"></ion-tab>
          <ion-tab tab="tab-settings-searches" component="tab-settings-searches"></ion-tab>
          <ion-tab tab="tab-settings-security" component="tab-settings-security"></ion-tab>

          <ion-tab-bar slot="top">
            <ion-tab-button tab="tab-settings-preferences" href="/settings/preferences">
              <ion-icon name="options"></ion-icon>
              <ion-label>Preferences</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="tab-settings-searches" href="/settings/searches">
              <ion-icon name="search"></ion-icon>
              <ion-label>Searches</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="tab-settings-security" href="/settings/security">
              <ion-icon name="finger-print"></ion-icon>
              <ion-label>Security</ion-label>
            </ion-tab-button>
          </ion-tab-bar>
        </ion-tabs>
      </div>
    `;
  }
}

