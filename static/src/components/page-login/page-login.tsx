import { Component, Element, h, State } from '@stencil/core';
import { AuthApi } from '../../helpers/api';

@Component({
  tag: 'page-login',
  styleUrl: 'page-login.css'
})
export class PageLogin {
  @State() email: string | null;
  @State() password: string | null;

  @Element() el: HTMLPageLoginElement;

  render() {
    return (
      <ion-content>
        <ion-grid class="no-pad">
          <ion-row class="ion-justify-content-center">
            <ion-col size-xs="12" size-sm="12" size-md="10" size-lg="8" size-xl="6">
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
      //this.errorMessage = '';
      const token = await AuthApi.authenticate(this.el, this.email, this.password);
      localStorage.setItem('jwtToken', token);
      //this.dispatchEvent(new CustomEvent('authentication-changed', { bubbles: true, composed: true }));
      const router = document.querySelector('ion-router');
      await router.push('/');
    } catch (ex) {
      this.password = '';
      //this.errorMessage = 'Login failed. Check your username and password and try again.';
      console.error(ex);
    }
  }

  private onInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.onLoginClicked();
    }
  }

}
