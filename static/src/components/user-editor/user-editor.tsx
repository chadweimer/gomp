import { Component, Element, h } from '@stencil/core';

@Component({
  tag: 'user-editor',
  styleUrl: 'user-editor.css'
})
export class UserEditor {

  @Element() el: HTMLElement;

  render() {
    return [
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button>Save</ion-button>
          </ion-buttons>
          <ion-title>New User</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <ion-item>
          <ion-label position="floating">Email</ion-label>
          <ion-input />
        </ion-item>
        <ion-item>
          <ion-label position="floating">Access Level</ion-label>
          <ion-select placeholder="Select One" />
        </ion-item>
        <ion-item>
          <ion-label position="floating">Password</ion-label>
          <ion-input type="password" />
        </ion-item>
        <ion-item>
          <ion-label position="floating">Confirm Password</ion-label>
          <ion-input type="password" />
        </ion-item>
      </ion-content>
    ];
  }

  onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      'dismissed': true
    });
  }
}
