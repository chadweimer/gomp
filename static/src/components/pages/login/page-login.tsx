import { Component, Element, h, State } from '@stencil/core';
import { api } from '../../../helpers/api';
import { isNullOrEmpty, redirect } from '../../../helpers/utils';
import state from '../../../stores/state';

@Component({
  tag: 'page-login',
  styleUrl: 'page-login.css'
})
export class PageLogin {
  @State() errorMessage = '';
  @State() username: string | null | undefined = '';
  @State() password: string | null | undefined = '';
  @State() rememberMe = false;

  @Element() el!: HTMLPageLoginElement;

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
                      value={this.username}
                      onIonInput={e => this.username = e.detail.value}
                      onKeyDown={(e: KeyboardEvent) => this.onInputKeyDown(e)}
                      required />
                  </ion-item>
                  <ion-item>
                    <ion-icon slot="end" name="eye-off" />
                    <ion-input type="password"
                      label="Password"
                      autocomplete="current-password"
                      value={this.password}
                      onIonInput={e => this.password = e.detail.value}
                      onKeyDown={(e: KeyboardEvent) => this.onInputKeyDown(e)}
                      required />
                  </ion-item>
                  <ion-item lines="none">
                    <ion-checkbox justify="start"
                      checked={this.rememberMe}
                      onIonChange={e => this.rememberMe = e.detail.checked}>
                      Remember Me
                    </ion-checkbox>
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
      if (isNullOrEmpty(this.username) || isNullOrEmpty(this.password)) {
        this.errorMessage = 'Username and password are required.';
        return;
      }

      const { data: user, error, response } = await api.client.POST('/auth', {
        body: { username: this.username, password: this.password, rememberMe: this.rememberMe }
      });

      if (!response.ok) {
        throw new Error('Failed to login.');
      }

      if (error) {
        throw new Error('Failed to login.', { cause: error });
      }

      // Store the user so we stay logged in
      state.currentUser = user;

      // Clear the username so it's not left around when the next login is needed
      this.username = '';

      await redirect('/');
    } catch (ex) {
      this.errorMessage = 'Login failed. Check your username and password and try again.';
      console.error(ex);
    } finally {
      // Clear password no matter what, success or failure
      this.password = '';
    }
  }

  private async onInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      await this.onLoginClicked();
    }
  }

}
