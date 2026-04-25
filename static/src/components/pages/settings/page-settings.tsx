import { Gesture } from '@ionic/core';
import { Component, Element, h } from '@stencil/core';
import { createSwipeGesture, sendActivatedCallback } from '../../../helpers/utils';
import { SwipeDirection } from '../../../models';

@Component({
  tag: 'page-settings',
  styleUrl: 'page-settings.css'
})
export class PageSettings {
  @Element() el!: HTMLPageSettingsElement;
  private tabs!: HTMLIonTabsElement;
  private gesture: Gesture | null = null;

  connectedCallback() {
    this.gesture = createSwipeGesture(this.el, swipe => {
      this.tabs.getSelected()
        .then(async selectedTab => {
          switch (selectedTab) {
            case 'tab-settings-preferences':
              if (swipe === SwipeDirection.Left) {
                await this.tabs.select('tab-settings-searches');
              }
              break;
            case 'tab-settings-searches':
              switch (swipe) {
                case SwipeDirection.Left:
                  await this.tabs.select('tab-settings-security');
                  break
                case SwipeDirection.Right:
                  await this.tabs.select('tab-settings-preferences');
                  break;
              }
              break;
            case 'tab-settings-security':
              if (swipe === SwipeDirection.Right) {
                await this.tabs.select('tab-settings-searches');
              }
              break;
          }
        })
        .catch(console.error);
    });
    this.gesture.enable();
  }

  disconnectedCallback() {
    this.gesture?.destroy();
    this.gesture = null;
  }

  render() {
    return (
      <ion-tabs
        onIonTabsDidChange={() => sendActivatedCallback(this.tabs)}
        ref={(el: HTMLIonTabsElement) => this.tabs = el}>
        <ion-tab tab="tab-settings-preferences" component="page-settings-preferences" />
        <ion-tab tab="tab-settings-searches" component="page-settings-searches" />
        <ion-tab tab="tab-settings-security" component="page-settings-security" />

        <ion-tab-bar slot="top">
          <ion-tab-button tab="tab-settings-preferences" href="/settings/preferences">
            <ion-icon name="options" />
            <ion-label>Preferences</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="tab-settings-searches" href="/settings/searches">
            <ion-icon name="search" />
            <ion-label>Searches</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="tab-settings-security" href="/settings/security">
            <ion-icon name="finger-print" />
            <ion-label>Security</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    );
  }
}
