import { Gesture } from '@ionic/core';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { createSwipeGesture, sendActivatedCallback } from '../../../helpers/utils';
import { SwipeDirection } from '../../../models';
import '../settings-preferences/page-settings-preferences';
import '../settings-searches/page-settings-searches';
import '../settings-security/page-settings-security';
import './page-settings.css';

@customElement('page-settings')
export class PageSettings extends LitElement {
  private gesture: Gesture | null = null;

  protected createRenderRoot() {
    return this;
  }

  private get tabs(): HTMLIonTabsElement | null {
    return this.querySelector('ion-tabs');
  }

  override connectedCallback() {
    super.connectedCallback();
    this.gesture = createSwipeGesture(this, swipe => {
      const tabs = this.tabs;
      if (!tabs) return;

      tabs.getSelected()
        .then(async selectedTab => {
          switch (selectedTab) {
            case 'tab-settings-preferences':
              if (swipe === SwipeDirection.Left) {
                await tabs.select('tab-settings-searches');
              }
              break;
            case 'tab-settings-searches':
              switch (swipe) {
                case SwipeDirection.Left:
                  await tabs.select('tab-settings-security');
                  break;
                case SwipeDirection.Right:
                  await tabs.select('tab-settings-preferences');
                  break;
              }
              break;
            case 'tab-settings-security':
              if (swipe === SwipeDirection.Right) {
                await tabs.select('tab-settings-searches');
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
      <ion-tabs @ionTabsDidChange=${() => {
        const tabs = this.tabs;
        if (tabs) {
          sendActivatedCallback(tabs);
        }
      }}>
        <ion-tab tab="tab-settings-preferences" component="page-settings-preferences"></ion-tab>
        <ion-tab tab="tab-settings-searches" component="page-settings-searches"></ion-tab>
        <ion-tab tab="tab-settings-security" component="page-settings-security"></ion-tab>

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
    `;
  }
}
