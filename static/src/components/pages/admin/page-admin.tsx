import { Gesture } from '@ionic/core';
import { Component, Element, Host, h } from '@stencil/core';
import { createSwipeGesture, sendActivatedCallback } from '../../../helpers/utils';
import { SwipeDirection } from '../../../models';

@Component({
  tag: 'page-admin',
  styleUrl: 'page-admin.css'
})
export class PageAdmin {
  @Element() el!: HTMLPageAdminElement;
  private tabs!: HTMLIonTabsElement;
  private gesture: Gesture | null = null;

  connectedCallback() {
    this.gesture = createSwipeGesture(this.el, swipe => {
      this.tabs.getSelected()
        .then(async selectedTab => {
          switch (selectedTab) {
            case 'tab-admin-configuration':
              if (swipe === SwipeDirection.Left) {
                await this.tabs.select('tab-admin-users');
              }
              break;
            case 'tab-admin-users':
              switch (swipe) {
                case SwipeDirection.Left:
                  await this.tabs.select('tab-admin-maintenance');
                  break
                case SwipeDirection.Right:
                  await this.tabs.select('tab-admin-configuration');
                  break;
              }
              break;
            case 'tab-admin-maintenance':
              if (swipe === SwipeDirection.Right) {
                await this.tabs.select('tab-admin-users');
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
      <Host>
        <ion-tabs ref={(el: HTMLIonTabsElement) => this.tabs = el}
          onIonTabsDidChange={() => sendActivatedCallback(this.tabs)}>
          <ion-tab tab="tab-admin-configuration" component="page-admin-configuration" />
          <ion-tab tab="tab-admin-users" component="page-admin-users" />
          <ion-tab tab="tab-admin-maintenance" component="page-admin-maintenance" />

          <ion-tab-bar slot="top">
            <ion-tab-button tab="tab-admin-configuration" href="/admin/configuration">
              <ion-icon name="document-text" />
              <ion-label>Configuration</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="tab-admin-users" href="/admin/users">
              <ion-icon name="people" />
              <ion-label>Users</ion-label>
            </ion-tab-button>
            <ion-tab-button tab="tab-admin-maintenance" href="/admin/maintenance">
              <ion-icon name="build" />
              <ion-label>Maintenance</ion-label>
            </ion-tab-button>
          </ion-tab-bar>
        </ion-tabs>
      </Host>
    );
  }
}
