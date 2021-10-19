import { createGesture, Gesture } from '@ionic/core';
import { Component, Element, h } from '@stencil/core';

@Component({
  tag: 'page-admin',
  styleUrl: 'page-admin.css'
})
export class PageAdmin {
  @Element() el!: HTMLPageAdminElement;
  private tabs!: HTMLIonTabsElement;
  private gesture: Gesture;

  connectedCallback() {
    this.gesture = createGesture({
      el: this.el,
      threshold: 50,
      gestureName: 'swipe',
      onEnd: e => {
        if (Math.abs(e.velocityX) < 0.2) return

        this.tabs.getSelected().then(selectedTab => {
          const swipeLeft = e.velocityX < 0;
          switch (selectedTab) {
            case 'tab-admin-configuration':
              if (swipeLeft) {
                this.tabs.select('tab-admin-users');
              }
              break;
            case 'tab-admin-users':
              if (!swipeLeft) {
                this.tabs.select('tab-admin-configuration');
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
        <ion-tab tab="tab-admin-configuration" component="page-admin-configuration" />
        <ion-tab tab="tab-admin-users" component="page-admin-users" />

        <ion-tab-bar slot="top">
          <ion-tab-button tab="tab-admin-configuration" href="/admin/configuration">
            <ion-icon name="construct" />
            <ion-label>Configuration</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="tab-admin-users" href="/admin/users">
            <ion-icon name="people" />
            <ion-label>Users</ion-label>
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
