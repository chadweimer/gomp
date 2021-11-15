import { createGesture, Gesture } from '@ionic/core';
import { Component, Element, h } from '@stencil/core';
import { getSwipe, sendActivatedCallback, sendDeactivatingCallback } from '../../../helpers/utils';
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
    this.gesture = createGesture({
      el: this.el,
      threshold: 30,
      gestureName: 'swipe',
      onEnd: e => {
        const swipe = getSwipe(e);
        if (!swipe) return

        this.tabs.getSelected().then(selectedTab => {
          switch (selectedTab) {
            case 'tab-admin-configuration':
              if (swipe === SwipeDirection.Left) {
                this.tabs.select('tab-admin-users');
              }
              break;
            case 'tab-admin-users':
              if (swipe === SwipeDirection.Right) {
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
      <ion-tabs onIonTabsWillChange={() => sendDeactivatingCallback(this.tabs)} onIonTabsDidChange={() => sendActivatedCallback(this.tabs)} ref={el => this.tabs = el}>
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
}
