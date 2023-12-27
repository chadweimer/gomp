import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { AccessLevel, User } from '../../generated';
import { configureModalAutofocus, dismissContainingModal, insertSpacesBetweenWords } from '../../helpers/utils';

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
            <ion-item lines="full">
              <ion-input label="Email" label-placement="stacked" type="email" value={this.user.username} disabled={!!this.user.id}
                onIonBlur={e => this.user = { ...this.user, username: e.target.value as string }}
                required
                autofocus />
            </ion-item>
            <ion-item lines="full">
              <ion-select label="Access Level" label-placement="stacked" value={this.user.accessLevel} interface="popover" onIonChange={e => this.user = { ...this.user, accessLevel: e.detail.value }}>
                {Object.keys(AccessLevel).map(item =>
                  <ion-select-option key={item} value={AccessLevel[item]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            {!this.user.id ?
              <ion-item lines="full">
                <ion-input label="Password" label-placement="stacked" type="password"
                  autocomplete="new-password"
                  onIonBlur={e => this.password = e.target.value as string}
                  required />
              </ion-item>
              : ''}
            {!this.user.id ?
              <ion-item lines="full">
                <ion-input label="Confirm Password" label-placement="stacked" type="password"
                  autocomplete="new-password"
                  onIonBlur={e => this.repeatPassword = e.target.value as string} ref={el => this.repeatPasswordInput = el}
                  required />
              </ion-item>
              : ''}
          </form>
        </ion-content>
      </Host>
    );
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
