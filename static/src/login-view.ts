import { TextField } from '@material/mwc-textfield';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { GompBaseElement } from './common/gomp-base-element.js';
import '@material/mwc-button';
import '@material/mwc-textfield';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-card/paper-card.js';
import './common/shared-styles.js';

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
                        <p><mwc-textfield id="username" name="username" class="fill" label="Email" type="email" on-keydown="onInputKeydown" autofocus autocomplete></mwc-textfield></p>
                        <p><mwc-textfield id="password" name="password" class="fill" label="Password" type="password" on-keydown="onInputKeydown" required></mwc-textfield></p>
                        <div class="red">[[errorMessage]]</div>
                    </div>
                    <div class="card-actions">
                        <mwc-button label="Login" on-click="onLoginClicked"></mwc-button>
                    </div>
                </paper-card>
            </div>
`;
    }

    @query('#username')
    private username!: TextField;
    @query('#password')
    private password!: TextField;

    @property({type: String, notify: true})
    public errorMessage = '';

    protected isActiveChanged(isActive: boolean) {
        if (isActive) {
            this.username.value = '';
            this.password.value = '';
            this.errorMessage = '';
        }
    }
    protected async onLoginClicked() {
        const username = this.username.value.trim();
        if (username === '') {
            this.username.setCustomValidity('Username is required');
            this.username.reportValidity();
            return;
        } else {
            this.username.setCustomValidity('');
            this.username.reportValidity();
        }
        const password = this.password.value.trim();
        if (password === '') {
            this.password.setCustomValidity('Password is required');
            this.password.reportValidity();
            return;
        } else {
            this.password.setCustomValidity('');
            this.password.reportValidity();
        }

        const authDetails = {
            username: username,
            password: password
        };
        try {
            this.errorMessage = '';
            const response: {token: string} = await this.AjaxPostWithResult('/api/v1/auth', authDetails);
            localStorage.setItem('jwtToken', response.token);
            this.dispatchEvent(new CustomEvent('authentication-changed', {bubbles: true, composed: true}));
            this.navigateTo('/home');
        } catch (e) {
            this.password.value = '';
            this.errorMessage = 'Login failed. Check your username and password and try again.';
            console.error(e);
        }
    }
    protected onInputKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            this.onLoginClicked();
        }
    }
}
