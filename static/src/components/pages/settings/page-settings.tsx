import { createGesture, Gesture } from '@ionic/core';
import { Component, Element, h } from '@stencil/core';
import { getSwipe } from '../../../helpers/utils';
import { SwipeDirection } from '../../../models';

@Component({
  tag: 'page-settings',
  styleUrl: 'page-settings.css'
})
export class PageSettings {
  @Element() el!: HTMLPageSettingsElement;
  private tabs!: HTMLIonTabsElement;
  private gesture: Gesture;

  connectedCallback() {
    this.gesture = createGesture({
      el: this.el,
      threshold: 30,
      gestureName: 'swipe',
      onEnd: e => {
        const swipe = getSwipe(e);
        if (!swipe) return

        this.tabs.getSelected().then(selectedTab => {
          switch (selectedTab) {
            case 'tab-settings-preferences':
              if (swipe === SwipeDirection.Left) {
                this.tabs.select('tab-settings-searches');
              }
              break;
            case 'tab-settings-searches':
              switch (swipe) {
                case SwipeDirection.Left:
                  this.tabs.select('tab-settings-security');
                  break
                case SwipeDirection.Right:
                  this.tabs.select('tab-settings-preferences');
                  break;
              }
              break;
            case 'tab-settings-security':
              if (swipe === SwipeDirection.Right) {
                this.tabs.select('tab-settings-searches');
              }
              break;
          }
        });
      }
    });
    this.gesture.enable();
  }

  disconnectedCallback() {
    this.gesture.destroy();
    this.gesture = null;
  }

  render() {
    return (
      <ion-tabs onIonTabsWillChange={() => this.onTabsChanging()} onIonTabsDidChange={() => this.onTabsChanged()} ref={el => this.tabs = el}>
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

  private async getActiveComponent() {
    const tabId = await this.tabs.getSelected();
    if (tabId !== undefined) {
      const tab = await this.tabs.getTab(tabId);
      return tab.querySelector(tab.component.toString());
    }

    return undefined;
  }

  private async onTabsChanging() {
    // Let the current page know it's being deactivated
    const el = await this.getActiveComponent() as any;
    if (el && typeof el.deactivatingCallback === 'function') {
      el.deactivatingCallback();
    }
  }

  private async onTabsChanged() {
    // Let the new page know it's been activated
    const el = await this.getActiveComponent() as any;
    if (el && typeof el.activatedCallback === 'function') {
      el.activatedCallback();
    }
  }
}
