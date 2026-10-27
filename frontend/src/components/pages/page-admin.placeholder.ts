import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('tab-admin-configuration')
export class TabAdminConfigurationPlaceholder extends LitElement {
  createRenderRoot() { return this; }
  render() {
    return html`
      <div class="ion-page">
        <ion-content class="ion-padding">
          <h3>Admin Configuration Placeholder</h3>
        </ion-content>
      </div>
    `;
  }
}

@customElement('tab-admin-users')
export class TabAdminUsersPlaceholder extends LitElement {
  createRenderRoot() { return this; }
  render() {
    return html`
      <div class="ion-page">
        <ion-content class="ion-padding">
          <h3>Admin Users Placeholder</h3>
        </ion-content>
      </div>
    `;
  }
}

@customElement('tab-admin-maintenance')
export class TabAdminMaintenancePlaceholder extends LitElement {
  createRenderRoot() { return this; }
  render() {
    return html`
      <div class="ion-page">
        <ion-content class="ion-padding">
          <h3>Admin Maintenance Placeholder</h3>
        </ion-content>
      </div>
    `;
  }
}

@customElement('page-admin')
export class PageAdminPlaceholder extends LitElement {
  createRenderRoot() { return this; }

  render() {
    return html`
      <div class="ion-page">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-buttons slot="start">
              <ion-menu-button></ion-menu-button>
            </ion-buttons>
            <ion-title>Admin (Placeholder)</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-tabs>
          <ion-tab tab="tab-admin-configuration" component="tab-admin-configuration"></ion-tab>
          <ion-tab tab="tab-admin-users" component="tab-admin-users"></ion-tab>
          <ion-tab tab="tab-admin-maintenance" component="tab-admin-maintenance"></ion-tab>

          <ion-tab-bar slot="top">
            <ion-tab-button tab="tab-admin-configuration" href="/admin/configuration">
              <ion-icon name="document-text"></ion-icon>
              <ion-label>Configuration</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="tab-admin-users" href="/admin/users">
              <ion-icon name="people"></ion-icon>
              <ion-label>Users</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="tab-admin-maintenance" href="/admin/maintenance">
              <ion-icon name="build"></ion-icon>
              <ion-label>Maintenance</ion-label>
            </ion-tab-button>
          </ion-tab-bar>
        </ion-tabs>
      </div>
    `;
  }
}

