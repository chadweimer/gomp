import { Component, Element, h, State } from '@stencil/core';
import { AuthApi } from '../../../helpers/api';
import { redirect } from '../../../helpers/utils';
import state from '../../../store';

@Component({
  tag: 'page-login',
  styleUrl: 'page-login.css'
})
export class PageLogin {
  @State() email: string | null;
  @State() password: string | null;
  @State() errorMessage: string | null;

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
                    <ion-label>Email</ion-label>
                    <ion-input value={this.email}
                      onIonChange={e => this.email = e.detail.value}
                      onKeyDown={e => this.onInputKeyDown(e)} />
                  </ion-item>
                  <ion-item>
                    <ion-icon slot="end" name="eye-off" />
                    <ion-label>Password</ion-label>
                    <ion-input type="password" value={this.password}
                      onIonChange={e => this.password = e.detail.value}
                      onKeyDown={e => this.onInputKeyDown(e)} />
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
      this.errorMessage = null;
      const token = await AuthApi.authenticate(this.el, this.email, this.password);
      state.jwtToken = token;
      await redirect('/');
    } catch (ex) {
      this.password = '';
      this.errorMessage = 'Login failed. Check your username and password and try again.';
      console.error(ex);
    }
  }

  private onInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.onLoginClicked();
    }
  }

}
