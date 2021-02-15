'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperButtonElement } from '@polymer/paper-button/paper-button.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-input/paper-input.js';
import '@cwmr/paper-password-input/paper-password-input.js';
import './shared-styles.js';

@customElement('login-view')
export class LoginView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                @media screen and (min-width: 600px) {
                    paper-card {
                        width: 50%;
                    }
                }
                @media screen and (max-width: 599px) {
                    paper-card {
                        width: 100%;
                    }
                }
            </style>
            <div class="padded-10 centered-horizontal">
                <paper-card heading="Login">
                    <div class="card-content">
                        <paper-input name="username" value="{{username}}" label="Email" on-keydown="onInputKeydown" required autofocus autocomplete></paper-input>
                        <paper-password-input name="password" value="{{password}}" label="Password" on-keydown="onInputKeydown" required></paper-password-input>
                        <div class="red">[[errorMessage]]</div>
                    </div>
                    <div class="card-actions">
                        <paper-button id="loginButton" on-click="onLoginClicked">Login</paper-button>
                    </div>
                </paper-card>
            </div>
`;
    }

    @property({type: String, notify: true})
    public username = '';
    @property({type: String, notify: true})
    public password = '';
    @property({type: String, notify: true})
    public errorMessage = '';

    private get loginButton(): PaperButtonElement {
        return this.$.loginButton as PaperButtonElement;
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive) {
            this.username = '';
            this.password = '';
            this.errorMessage = '';
        }
    }
    protected async onLoginClicked() {
        const authDetails = {
            username: this.username,
            password: this.password
        };
        try {
            this.errorMessage = '';
            const response: {token: string} = await this.AjaxPostWithResult('/api/v1/auth', authDetails);
            localStorage.setItem('jwtToken', response.token);
            this.dispatchEvent(new CustomEvent('authentication-changed', {bubbles: true, composed: true}));
            this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/home'}}));
        } catch (e) {
            this.password = '';
            this.errorMessage = 'Login failed. Check your username and password and try again.';
            console.error(e);
        }
    }
    protected onInputKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            this.loginButton.click();
        }
    }
}
