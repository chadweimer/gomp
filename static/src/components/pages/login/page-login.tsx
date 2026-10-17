import { Component, Element, h, State } from '@stencil/core';
import { api } from '../../../helpers/api';
import { redirect } from '../../../helpers/utils';
import state from '../../../stores/state';

@Component({
  tag: 'page-login',
  styleUrl: 'page-login.css'
})
export class PageLogin {
  @State() errorMessage = '';
  @State() rememberMe = false;

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
                    <ion-input type="email"
                      label="Email"
                      autocomplete="username"
                      onKeyDown={(e: KeyboardEvent) => this.onInputKeyDown(e)}
                      ref={el => this.usernameInput = el!}
                      required />
                  </ion-item>
                  <ion-item>
                    <ion-input type="password"
                      label="Password"
                      autocomplete="current-password"
                      onKeyDown={(e: KeyboardEvent) => this.onInputKeyDown(e)}
                      ref={el => this.passwordInput = el!}
                      required>
                      <ion-input-password-toggle slot="end"></ion-input-password-toggle>
                    </ion-input>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-toggle justify="start"
                      checked={this.rememberMe}
                      onIonChange={e => this.rememberMe = e.detail.checked}>
                      Remember Me
                    </ion-toggle>
                  </ion-item>
                  <ion-text color="danger">{this.errorMessage}</ion-text>
                </ion-card-content>
                <ion-button fill="clear" color="primary" onClick={() => this.onLoginClicked()}>Login</ion-button>
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

      const { data: user, error, response } = await api.client.POST('/auth', {
        body: { username, password, rememberMe: this.rememberMe }
      });

      if (error) {
        throw new Error('Failed to login.', { cause: error });
      }

      if (!response.ok) {
        throw new Error('Failed to login.');
      }

      // Store the user so we stay logged in
      state.currentUser = user;

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

  private async onInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      await this.onLoginClicked();
    }
  }

}
