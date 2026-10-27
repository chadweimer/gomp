import { LitElement, html } from 'lit';
import { customElement, state as litState, query } from 'lit/decorators.js';
import { AccessLevel, User } from '../../../helpers/schema.gen';
import { api } from '../../../helpers/api';
import { showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, enumKeyFromValue, insertSpacesBetweenWords } from '../../../helpers/utils';
import './page-settings-security.css';

@customElement('page-settings-security')
export class PageSettingsSecurity extends LitElement implements ComponentWithActivatedCallback {
  @litState() currentUser: User | undefined;
  @litState() currentPassword = '';
  @litState() newPassword = '';
  @litState() repeatPassword = '';

  @query('form') private readonly form?: HTMLFormElement;
  @query('#repeat-password') private readonly repeatPasswordInput?: HTMLIonInputElement;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activatedCallback().catch(console.error);
  }

  async activatedCallback() {
    await this.loadUser();
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad" fixed>
          <ion-row>
            <ion-col>
              <form @submit=${(e: Event) => e.preventDefault()}>
                <ion-card>
                  <ion-card-content>
                    <ion-item lines="full">
                      <ion-input
                        label="Email"
                        label-placement="stacked"
                        type="email"
                        .value=${this.currentUser?.username ?? ''}
                        disabled
                      ></ion-input>
                    </ion-item>
                    <ion-item lines="full">
                      <ion-input
                        label="Access Level"
                        label-placement="stacked"
                        .value=${insertSpacesBetweenWords(enumKeyFromValue(AccessLevel, this.currentUser?.accessLevel))}
                        disabled
                      ></ion-input>
                    </ion-item>
                    <ion-item lines="full">
                      <ion-input
                        label="Current Password"
                        label-placement="stacked"
                        type="password"
                        .value=${this.currentPassword}
                        autocomplete="current-password"
                        @ionBlur=${(e: Event) => this.currentPassword = (e.currentTarget as HTMLIonInputElement).value as string}
                        required
                      ></ion-input>
                    </ion-item>
                    <ion-item lines="full">
                      <ion-input
                        label="New Password"
                        label-placement="stacked"
                        type="password"
                        .value=${this.newPassword}
                        autocomplete="new-password"
                        @ionBlur=${(e: Event) => this.newPassword = (e.currentTarget as HTMLIonInputElement).value as string}
                        required
                      ></ion-input>
                    </ion-item>
                    <ion-item lines="full">
                      <ion-input
                        label="Confirm Password"
                        label-placement="stacked"
                        id="repeat-password"
                        type="password"
                        .value=${this.repeatPassword}
                        autocomplete="new-password"
                        @ionBlur=${(e: Event) => this.repeatPassword = (e.currentTarget as HTMLIonInputElement).value as string}
                        required
                      ></ion-input>
                    </ion-item>
                  </ion-card-content>
                  <ion-button fill="clear" color="primary" @click=${() => this.onUpdatePasswordClicked()}>
                    <ion-icon slot="start" name="save"></ion-icon>
                    Update Password
                  </ion-button>
                </ion-card>
              </form>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    `;
  }

  async loadUser() {
    try {
      const { data: user, error } = await api.client.GET('/users/current');

      if (error) {
        throw new Error('Failed to load current user', { cause: error });
      }

      this.currentUser = user;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async updateUserPassword(currentPassword: string, newPassword: string) {
    try {
      const { error } = await api.client.PUT('/users/current/password', {
        body: { currentPassword, newPassword }
      });

      if (error) {
        throw new Error('Failed to update password.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to update password.');
    }
  }

  async onUpdatePasswordClicked() {
    const native = await this.repeatPasswordInput?.getInputElement();
    native?.setCustomValidity(this.newPassword === this.repeatPassword ? '' : 'Passwords must match');

    if (this.form && !this.form.reportValidity()) {
      return;
    }

    await this.updateUserPassword(this.currentPassword, this.newPassword);

    this.currentPassword = '';
    this.newPassword = '';
    this.repeatPassword = '';
  }
}
