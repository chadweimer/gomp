import { Component, Element, h } from '@stencil/core';

@Component({
  tag: 'user-editor',
  styleUrl: 'user-editor.css'
})
export class UserEditor {

  @Element() el: HTMLElement;

  render() {
    return (
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
      </ion-header>
    );
  }

  onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      'dismissed': true
    });
  }
}
