'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperButtonElement } from '@polymer/paper-button/paper-button.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
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
                    padding: 8px;
                }
                .container {
                    @apply --layout-horizontal;
                    @apply --layout-center-justified;
                }
                .error {
                    color: red;
                }
                @media screen and (min-width: 601px) {
                    paper-card {
                        width: 50%;
                    }
                }
                @media screen and (max-width: 600px) {
                    paper-card {
                        width: 100%;
                    }
                }
            </style>
            <div class="container">
                <paper-card heading="Login">
                    <div class="card-content">
                        <paper-input name="username" value="{{username}}" label="Email" on-keydown="onInputKeydown" required="" autofocus="" autocomplete=""></paper-input>
                        <paper-password-input name="password" value="{{password}}" label="Password" on-keydown="onInputKeydown" required=""></paper-password-input>
                        <div class="error">[[errorMessage]]</div>
                    </div>
                    <div class="card-actions">
                        <paper-button id="loginButton" on-click="onLoginClicked">Login</paper-button>
                    </div>
                </paper-card>
            </div>

            <iron-ajax bubbles="" id="authAjax" url="/api/v1/auth" method="POST" on-request="handlePostAuthRequest" on-response="handlePostAuthResponse" on-error="handlePostAuthError"></iron-ajax>
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
    private get authAjax(): IronAjaxElement {
        return this.$.authAjax as IronAjaxElement;
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive) {
            this.username = '';
            this.password = '';
            this.errorMessage = '';
        }
    }
    protected onLoginClicked() {
        this.authAjax.body = JSON.stringify({username: this.username, password: this.password}) as any;
        this.authAjax.generateRequest();
    }
    protected onInputKeydown(e: KeyboardEvent) {
        if (e.keyCode === 13) {
            this.loginButton.click();
        }
    }
    protected handlePostAuthRequest() {
        this.errorMessage = '';
    }
    protected handlePostAuthResponse(e: CustomEvent) {
        localStorage.setItem('jwtToken', e.detail.response.token);
        this.dispatchEvent(new CustomEvent('authentication-changed', {bubbles: true, composed: true, detail: {user: e.detail.response.user}}));
        this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/home'}}));
    }
    protected handlePostAuthError() {
        this.password = '';
        this.errorMessage = 'Login failed. Check your username and password and try again.';
    }
}
