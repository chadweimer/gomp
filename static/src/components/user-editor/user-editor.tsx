import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { AccessLevel, User } from '../../helpers/schema.gen';
import { configureModalCanDismiss, getContainingModal } from '../../helpers/modals';
import { insertSpacesBetweenWords, isNull } from '../../helpers/utils';

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
  private usernameInput!: HTMLIonInputElement;
  private passwordInput!: HTMLIonInputElement;
  private repeatPasswordInput!: HTMLIonInputElement;
  private parentModal?: HTMLIonModalElement | null;

  connectedCallback() {
    const initialUser = { ...this.user };

    this.parentModal = getContainingModal(this.el);
    if (this.parentModal) {
      configureModalCanDismiss(this.parentModal, (_data?: unknown, role?: string) => {
        if (role === 'save') {
          return false;
        }

        // A blur event is not always guaranteed (e.g., if the user clicked the browser back button)
        this.user = {
          ...this.user,
          username: this.usernameInput.value as string
        };

        return this.user.username !== initialUser.username || this.user.accessLevel !== initialUser.accessLevel ||
          this.passwordInput.value !== '' || this.repeatPasswordInput.value !== '';
      });
    }
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{isNull(this.user?.id) ? 'New User' : 'Edit User'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el!}>
            <ion-item lines="full">
              <ion-input label="Email" label-placement="stacked" type="email" value={this.user?.username ?? ''} disabled={!isNull(this.user?.id)}
                onIonChange={e => this.user = { ...this.user, username: e.detail.value as string }}
                ref={el => this.usernameInput = el!}
                required
                autofocus />
            </ion-item>
            <ion-item lines="full">
              <ion-select label="Access Level" label-placement="stacked" value={this.user?.accessLevel ?? AccessLevel.Editor}
                onIonChange={(e: CustomEvent<{ value: AccessLevel }>) => this.user = { ...this.user, accessLevel: e.detail.value }}>
                {Object.keys(AccessLevel).map(item =>
                  <ion-select-option key={item} value={AccessLevel[item as keyof typeof AccessLevel]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            {isNull(this.user?.id) &&
              <ion-item lines="full">
                <ion-input label="Password" label-placement="stacked" type="password"
                  autocomplete="new-password"
                  onIonChange={e => this.password = e.detail.value as string}
                  ref={el => this.passwordInput = el!}
                  required />
              </ion-item>
            }
            {isNull(this.user?.id) &&
              <ion-item lines="full">
                <ion-input label="Confirm Password" label-placement="stacked" type="password"
                  autocomplete="new-password"
                  onIonChange={e => this.repeatPassword = e.detail.value as string}
                  ref={el => this.repeatPasswordInput = el!}
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

      await this.parentModal?.dismiss({
        user: this.user,
        password: this.password
      }, 'save');
    } else {
      await this.parentModal?.dismiss({ user: this.user }, 'save');
    }
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }
}
