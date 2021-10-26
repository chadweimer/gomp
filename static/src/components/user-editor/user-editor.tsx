import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { capitalizeFirstLetter, configureModalAutofocus, dismissContainingModal } from '../../helpers/utils';
import { AccessLevel, User } from '../../models';

@Component({
  tag: 'user-editor',
  styleUrl: 'user-editor.css'
})
export class UserEditor {
  @Prop() user: User = {
    username: '',
    accessLevel: AccessLevel.Editor
  };

  @State() password = '';
  @State() repeatPassword = '';

  @Element() el!: HTMLUserEditorElement;
  private form!: HTMLFormElement;
  private repeatPasswordInput!: HTMLIonInputElement;

  connectedCallback() {
    configureModalAutofocus(this.el);
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{!this.user.id ? 'New User' : 'Edit User'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            <ion-item>
              <ion-label position="stacked">Email</ion-label>
              <ion-input type="email" value={this.user.username} disabled={!!this.user.id} onIonChange={e => this.user = { ...this.user, username: e.detail.value }} required autofocus />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Access Level</ion-label>
              <ion-select value={this.user.accessLevel} interface="popover" onIonChange={e => this.user = { ...this.user, accessLevel: e.detail.value }}>
                {Object.values(AccessLevel).map(item =>
                  <ion-select-option value={item}>{capitalizeFirstLetter(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            {this.renderPasswords()}
          </form>
        </ion-content>
      </Host>
    );
  }

  private renderPasswords() {
    if (!this.user.id) {
      return [
        <ion-item>
          <ion-label position="stacked">Password</ion-label>
          <ion-input type="password" onIonChange={e => this.password = e.detail.value} required />
        </ion-item>,
        <ion-item>
          <ion-label position="stacked">Confirm Password</ion-label>
          <ion-input type="password" onIonChange={e => this.repeatPassword = e.detail.value} ref={el => this.repeatPasswordInput = el} required />
        </ion-item>,
      ];
    }
  }

  private async onSaveClicked() {
    if (!this.user.id) {
      const native = await this.repeatPasswordInput.getInputElement();
      if (this.password !== this.repeatPassword) {
        native.setCustomValidity('Passwords must match');
      } else {
        native.setCustomValidity('');
      }

      if (!this.form.reportValidity()) {
        return;
      }

      dismissContainingModal(this.el, {
        user: this.user,
        password: this.password
      });
    } else {
      dismissContainingModal(this.el, { user: this.user });
    }
  }

  private onCancelClicked() {
    dismissContainingModal(this.el);
  }
}
