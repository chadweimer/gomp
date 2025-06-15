import { Gesture } from '@ionic/core';
import { Component, Element, Host, h } from '@stencil/core';
import { createSwipeGesture, sendActivatedCallback, sendDeactivatingCallback } from '../../../helpers/utils';
import { SwipeDirection } from '../../../models';

@Component({
  tag: 'page-admin',
  styleUrl: 'page-admin.css'
})
export class PageAdmin {
  @Element() el!: HTMLPageAdminElement;
  private tabs!: HTMLIonTabsElement;
  private gesture: Gesture;

  connectedCallback() {
    this.gesture = createSwipeGesture(this.el, swipe => {
      this.tabs.getSelected().then(selectedTab => {
        switch (selectedTab) {
          case 'tab-admin-configuration':
            if (swipe === SwipeDirection.Left) {
              this.tabs.select('tab-admin-users');
            }
            break;
          case 'tab-admin-users':
            switch (swipe) {
              case SwipeDirection.Left:
                this.tabs.select('tab-admin-maintenance');
                break
              case SwipeDirection.Right:
                this.tabs.select('tab-admin-configuration');
                break;
            }
            break;
          case 'tab-admin-maintenance':
            if (swipe === SwipeDirection.Right) {
              this.tabs.select('tab-admin-users');
            }
            break;
        }
      });
    });
    this.gesture.enable();
  }

  disconnectedCallback() {
    this.gesture.destroy();
    this.gesture = null;
  }

  render() {
    return (
      <Host>
        <ion-tabs onIonTabsWillChange={() => sendDeactivatingCallback(this.tabs)} onIonTabsDidChange={() => sendActivatedCallback(this.tabs)} ref={el => this.tabs = el}>
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
