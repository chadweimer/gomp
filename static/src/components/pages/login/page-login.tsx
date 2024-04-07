import { Component, Element, h, State } from '@stencil/core';
import { appApi } from '../../../helpers/api';
import { redirect } from '../../../helpers/utils';
import state from '../../../stores/state';

@Component({
  tag: 'page-login',
  styleUrl: 'page-login.css'
})
export class PageLogin {
  @State() errorMessage = '';

  @Element() el!: HTMLPageLoginElement;

  private usernameInput!: HTMLIonInputElement;
  private passwordInput!: HTMLIonInputElement;

  render() {
    return (
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
                    <ion-label>Email</ion-label>
                    <ion-input type="email"
                      autocomplete="username"
                      onKeyDown={e => this.onInputKeyDown(e)}
                      ref={el => this.usernameInput = el}
                      required />
                  </ion-item>
                  <ion-item>
                    <ion-icon slot="end" name="eye-off" />
                    <ion-label>Password</ion-label>
                    <ion-input type="password"
                      autocomplete="current-password"
                      onKeyDown={e => this.onInputKeyDown(e)}
                      ref={el => this.passwordInput = el}
                      required />
                  </ion-item>
                  <ion-text color="danger">{this.errorMessage}</ion-text>
                </ion-card-content>
                <ion-footer>
                  <ion-toolbar>
                    <ion-buttons slot="primary">
                      <ion-button color="primary" onClick={() => this.onLoginClicked()}>Login</ion-button>
                    </ion-buttons>
                  </ion-toolbar>
                </ion-footer>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    );
  }

  private async onLoginClicked() {
    try {
      this.errorMessage = '';
      const username = this.usernameInput.value as string;
      const password = this.passwordInput.value as string;
      const { token } = await appApi.authenticate({ credentials: { username, password } });

      // Store the token so we stay logged in
      state.jwtToken = token;

      // Clear the username so it's not left around when the next login is needed
      this.usernameInput.value = '';

      await redirect('/');
    } catch (ex) {
      this.errorMessage = 'Login failed. Check your username and password and try again.';
      console.error(ex);
    } finally {
      // Clear password no matter what, success or failure
      this.passwordInput.value = '';
    }
  }

  private onInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.onLoginClicked();
    }
  }

}
