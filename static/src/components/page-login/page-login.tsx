import { Component, Element, h, State } from '@stencil/core';
import { ajaxPostWithResult } from '../../helpers/ajax';

@Component({
  tag: 'page-login',
  styleUrl: 'page-login.css'
})
export class PageLogin {
  @State() email: string | null;
  @State() password: string | null;

  @Element() el: HTMLElement;

  render() {
    return (
      <ion-card class="container">
        <ion-card-header>
          <ion-card-title>Login</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label>Email</ion-label>
            <ion-input value={this.email}
              onIonChange={e => this.email = e.detail.value}
              onKeyDown={e => this.onInputKeyDown(e)}></ion-input>
          </ion-item>
          <ion-item>
            <ion-icon slot="end" name="eye-off"></ion-icon>
            <ion-label>Password</ion-label>
            <ion-input type="password" value={this.password}
              onIonChange={e => this.password = e.detail.value}
              onKeyDown={e => this.onInputKeyDown(e)}></ion-input>
          </ion-item>
        </ion-card-content>
        <ion-item>
          <ion-button slot="start" fill="clear" size="default" onClick={() => this.onLoginClicked()}>Login</ion-button>
        </ion-item>
      </ion-card>
    );
  }

  private async onLoginClicked() {
    const router = document.querySelector('ion-router');

    const authDetails = {
      username: this.email,
      password: this.password
    };
    try {
      //this.errorMessage = '';
      const response: { token: string } = await ajaxPostWithResult(this.el, '/api/v1/auth', authDetails);
      localStorage.setItem('jwtToken', response.token);
      //this.dispatchEvent(new CustomEvent('authentication-changed', { bubbles: true, composed: true }));
      await router.push('/', 'forward');
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
