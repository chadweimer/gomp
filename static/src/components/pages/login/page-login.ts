import { LitElement, html } from 'lit';
import { customElement, state as litState, query } from 'lit/decorators.js';
import { api } from '../../../helpers/api';
import { redirect } from '../../../helpers/utils';
import state from '../../../stores/state';
import './page-login.css';

@customElement('page-login')
export class PageLogin extends LitElement {
  @litState() private errorMessage = '';
  @litState() private rememberMe = false;

  @query('#username-input') private usernameInput?: HTMLIonInputElement;
  @query('#password-input') private passwordInput?: HTMLIonInputElement;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad" fixed>
          <ion-row>
            <ion-col>
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Login</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-item>
                    <ion-input
                      id="username-input"
                      type="email"
                      label="Email"
                      autocomplete="username"
                      @keydown=${(e: KeyboardEvent) => this.onInputKeyDown(e)}
                      required
                    ></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input
                      id="password-input"
                      type="password"
                      label="Password"
                      autocomplete="current-password"
                      @keydown=${(e: KeyboardEvent) => this.onInputKeyDown(e)}
                      required
                    >
                      <ion-input-password-toggle slot="end"></ion-input-password-toggle>
                    </ion-input>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-toggle
                      justify="start"
                      .checked=${this.rememberMe}
                      @ionChange=${(e: CustomEvent<{ checked: boolean }>) => this.rememberMe = e.detail.checked}
                    >
                      Remember Me
                    </ion-toggle>
                  </ion-item>
                  <ion-text color="danger">${this.errorMessage}</ion-text>
                </ion-card-content>
                <ion-button fill="clear" color="primary" @click=${() => this.onLoginClicked()}>Login</ion-button>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    `;
  }

  private async onLoginClicked() {
    try {
      this.errorMessage = '';
      const username = (this.usernameInput?.value as string) ?? '';
      const password = (this.passwordInput?.value as string) ?? '';

      const { data: user, error, response } = await api.client.POST('/auth', {
        body: { username, password, rememberMe: this.rememberMe }
      });

      if (error) {
        throw new Error('Failed to login.', { cause: error });
      }

      if (!response?.ok) {
        throw new Error('Failed to login.');
      }

      // Store the user so we stay logged in
      state.currentUser = user;

      // Clear the username so it's not left around when the next login is needed
      if (this.usernameInput) {
        this.usernameInput.value = '';
      }

      await redirect('/');
    } catch (ex) {
      this.errorMessage = 'Login failed. Check your username and password and try again.';
      console.error(ex);
    } finally {
      // Clear password no matter what, success or failure
      if (this.passwordInput) {
        this.passwordInput.value = '';
      }
    }
  }

  private async onInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      await this.onLoginClicked();
    }
  }
}
