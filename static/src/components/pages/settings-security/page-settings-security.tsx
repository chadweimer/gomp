import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { AccessLevel, User } from '../../../generated';
import { usersApi } from '../../../helpers/api';
import { enumKeyFromValue, insertSpacesBetweenWords, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-settings-security',
  styleUrl: 'page-settings-security.css',
})
export class PageSettingsSecurity {
  @State() currentUser: User | null;
  @State() currentPassword = '';
  @State() newPassword = '';
  @State() repeatPassword = '';

  @Element() el!: HTMLPageSettingsSecurityElement;
  private securityForm!: HTMLFormElement;
  private repeatPasswordInput!: HTMLIonInputElement;

  @Method()
  async activatedCallback() {
    await this.loadUser();
  }

  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad" fixed>
            <ion-row>
              <ion-col>
                <form onSubmit={e => e.preventDefault()} ref={el => this.securityForm = el}>
                  <ion-card>
                    <ion-card-content>
                      <ion-item lines="full">
                        <ion-input label="Email" label-placement="stacked" type="email" value={this.currentUser?.username} disabled />
                      </ion-item>
                      <ion-item lines="full">
                        <ion-input label="Access Level" label-placement="stacked" value={insertSpacesBetweenWords(enumKeyFromValue(AccessLevel, this.currentUser?.accessLevel))} disabled />
                      </ion-item>
                      <ion-item lines="full">
                        <ion-input label="Current Password" label-placement="stacked" type="password" value={this.currentPassword}
                          autocomplete="current-password"
                          onIonBlur={e => this.currentPassword = e.target.value as string}
                          required />
                      </ion-item>
                      <ion-item lines="full">
                        <ion-input label="New Password" label-placement="stacked" type="password" value={this.newPassword}
                          autocomplete="new-password"
                          onIonBlur={e => this.newPassword = e.target.value as string}
                          required />
                      </ion-item>
                      <ion-item lines="full">
                        <ion-input label="Confirm Password" label-placement="stacked" type="password" value={this.repeatPassword}
                          autocomplete="new-password"
                          onIonBlur={e => this.repeatPassword = e.target.value as string}
                          ref={el => this.repeatPasswordInput = el}
                          required />
                      </ion-item>
                    </ion-card-content>
                    <ion-footer>
                      <ion-toolbar>
                        <ion-buttons slot="primary">
                          <ion-button color="primary" onClick={() => this.onUpdatePasswordClicked()}>Update Password</ion-button>
                        </ion-buttons>
                      </ion-toolbar>
                    </ion-footer>
                  </ion-card>
                </form>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
  }

  private async loadUser() {
    try {
      this.currentUser = await usersApi.getCurrentUser();
    } catch (ex) {
      console.error(ex);
    }
  }

  private async updateUserPassword(currentPassword: string, newPassword: string) {
    try {
      await usersApi.changePassword({
        userPasswordRequest: { currentPassword, newPassword }
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to update password.');
    }
  }

  private async onUpdatePasswordClicked() {
    const native = await this.repeatPasswordInput.getInputElement();
    if (this.newPassword !== this.repeatPassword) {
      native.setCustomValidity('Passwords must match');
    } else {
      native.setCustomValidity('');
    }

    if (!this.securityForm.reportValidity()) {
      return;
    }

    await this.updateUserPassword(this.currentPassword, this.newPassword);

    this.currentPassword = '';
    this.newPassword = '';
    this.repeatPassword = '';
  }

}
