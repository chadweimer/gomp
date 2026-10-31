import { Gesture } from '@ionic/core';
import { LitElement, html } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { createSwipeGesture, sendActivatedCallback } from '../../../helpers/utils';
import { SwipeDirection } from '../../../models';
import '../admin-configuration/page-admin-configuration';
import '../admin-users/page-admin-users';
import '../admin-maintenance/page-admin-maintenance';
import './page-admin.css';

@customElement('page-admin')
export class PageAdmin extends LitElement {
  private gesture: Gesture | null = null;

  @query('ion-tabs') private readonly tabs?: HTMLIonTabsElement;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.gesture = createSwipeGesture(this, swipe => {
      const tabs = this.tabs;
      if (!tabs) return;

      tabs.getSelected()
        .then(async selectedTab => {
          switch (selectedTab) {
            case 'tab-admin-configuration':
              if (swipe === SwipeDirection.Left) {
                await tabs.select('tab-admin-users');
              }
              break;
            case 'tab-admin-users':
              switch (swipe) {
                case SwipeDirection.Left:
                  await tabs.select('tab-admin-maintenance');
                  break;
                case SwipeDirection.Right:
                  await tabs.select('tab-admin-configuration');
                  break;
              }
              break;
            case 'tab-admin-maintenance':
              if (swipe === SwipeDirection.Right) {
                await tabs.select('tab-admin-users');
              }
              break;
          }
        })
        .catch(console.error);
    });
    this.gesture?.enable();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.gesture?.destroy();
    this.gesture = null;
  }

  render() {
    return html`
      <ion-tabs @ionTabsDidChange=${() => void this.onTabsDidChange()}>
        <ion-tab tab="tab-admin-configuration" component="page-admin-configuration"></ion-tab>
        <ion-tab tab="tab-admin-users" component="page-admin-users"></ion-tab>
        <ion-tab tab="tab-admin-maintenance" component="page-admin-maintenance"></ion-tab>

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
    `;
  }

  private async onTabsDidChange() {
    const tabs = this.tabs;
    if (tabs) {
      await sendActivatedCallback(tabs);
    }
  }
}
