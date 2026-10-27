import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AccessLevel } from '../../helpers/schema.gen';
import { redirect } from '../../helpers/utils';
import state from '../../stores/state';

@customElement('page-login')
export class PageLoginPlaceholder extends LitElement {
  createRenderRoot() {
    return this;
  }

  private mockLogin(accessLevel: AccessLevel) {
    state.currentUser = {
      id: 1,
      username: accessLevel === AccessLevel.Admin ? 'admin' : 'user',
      accessLevel,
    };
    redirect('/');
  }

  render() {
    return html`
      <div class="ion-page">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Login (Placeholder)</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <h2>Sign In to GOMP</h2>
          <p>Phase 1 Placeholder: Login</p>
          <ion-button @click=${() => this.mockLogin(AccessLevel.Admin)} color="primary">
            Mock Login as Admin
          </ion-button>
          <ion-button @click=${() => this.mockLogin(AccessLevel.Viewer)} fill="outline">
            Mock Login as Viewer
          </ion-button>
        </ion-content>
      </div>
    `;
  }
}

