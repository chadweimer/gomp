import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { AccessLevel, User } from '../../generated';
import { configureModalAutofocus, dismissContainingModal, insertSpacesBetweenWords, isNull } from '../../helpers/utils';

@Component({
  tag: 'user-editor',
  styleUrl: 'user-editor.css',
  shadow: true,
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
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{isNull(this.user.id) ? 'New User' : 'Edit User'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el!}>
            <ion-item lines="full">
              <ion-input label="Email" label-placement="stacked" type="email" value={this.user.username} disabled={!isNull(this.user.id)}
                onIonBlur={(e: Event) => this.user = { ...this.user, username: (e.currentTarget as HTMLIonInputElement).value as string }}
                required
                autofocus />
            </ion-item>
            <ion-item lines="full">
              <ion-select label="Access Level" label-placement="stacked" value={this.user.accessLevel}
                onIonChange={(e: CustomEvent<{ value: AccessLevel }>) => this.user = { ...this.user, accessLevel: e.detail.value }}>
                {Object.keys(AccessLevel).map(item =>
                  <ion-select-option key={item} value={AccessLevel[item as keyof typeof AccessLevel]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            {isNull(this.user.id) &&
              <ion-item lines="full">
                <ion-input label="Password" label-placement="stacked" type="password"
                  autocomplete="new-password"
                  onIonBlur={(e: Event) => this.password = (e.currentTarget as HTMLIonInputElement).value as string}
                  required />
              </ion-item>
            }
            {isNull(this.user.id) &&
              <ion-item lines="full">
                <ion-input label="Confirm Password" label-placement="stacked" type="password"
                  autocomplete="new-password"
                  onIonBlur={(e: Event) => this.repeatPassword = (e.currentTarget as HTMLIonInputElement).value as string}
                  ref={(el: HTMLIonInputElement) => this.repeatPasswordInput = el}
                  required />
              </ion-item>
            }
          </form>
        </ion-content>
      </Host>
    );
  }

  private async onSaveClicked() {
    if (isNull(this.user.id)) {
      const native = await this.repeatPasswordInput.getInputElement();
      native.setCustomValidity(this.password === this.repeatPassword ? '' : 'Passwords must match');

      if (!this.form.reportValidity()) {
        return;
      }

      await dismissContainingModal(this.el, {
        user: this.user,
        password: this.password
      });
    } else {
      await dismissContainingModal(this.el, { user: this.user });
    }
  }

  private async onCancelClicked() {
    await dismissContainingModal(this.el);
  }
}
