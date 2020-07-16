'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { GompBaseElement } from './common/gomp-base-element.js';
import '@polymer/paper-card/paper-card.js';
import './shared-styles.js';

@customElement('admin-view')
export class AdminView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    --paper-card: {
                        width: 100%;
                    }
                }
                .container {
                    padding: 10px;
                }
                .amber {
                    color: var(--paper-amber-500);
                }
                .red {
                    color: var(--paper-red-500);
                }
                .fill {
                    width: 100%
                }
                .left {
                    text-align: left;
                }
                .right {
                    text-align: right;
                }
                @media screen and (min-width: 993px) {
                    .container {
                        width: 50%;
                        margin: auto;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    .container {
                        width: 75%;
                        margin: auto;
                    }
                }
                @media screen and (max-width: 600px) {
                }
            </style>
            <div class="container">
                <paper-card>
                    <div class="card-content">
                        <h3>Users</h3>

                        <table class="fill">
                            <thead class="left">
                                <tr>
                                    <th>Username</th>
                                    <th>Access Level</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <template is="dom-repeat" items="[[users]]">
                                    <tr>
                                        <td>[[item.username]]</td>
                                        <td>[[item.accessLevel]]</td>
                                        <td class="right">
                                            <a href="#!" tabindex="-1" on-click="onEditUserClicked">
                                                <iron-icon class="amber" icon="icons:create" slot="item-icon"></iron-icon>
                                            </a>
                                            <a href="#!" tabindex="-1" on-click="onDeleteUserClicked">
                                                <iron-icon class="red" icon="icons:delete" slot="item-icon"></iron-icon>
                                            </a>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </paper-card>
            </div>
            <div class="container">
                <paper-card>
                    <div class="card-content">
                        <h3>New User</h3>
                        <paper-input label="Username" value="{{newUser.username}}" always-float-label="" disabled=""></paper-input>
                        <paper-input label="Access Level" value="{{newUser.accessLevel}}" always-float-label="" disabled=""></paper-input>
                        <paper-password-input label="New Password" value="{{newUser.password}}" always-float-label=""></paper-password-input>
                        <paper-password-input label="Confirm Password" value="{{newUser.repeatPassword}}" always-float-label=""></paper-password-input>
                    </div>
                    <div class="card-actions">
                        <paper-button on-click="onCreateUserClicked">
                            <iron-icon icon="icons:add"></iron-icon>
                            <span>Add</span>
                        <paper-button>
                    </div>
                </paper-card>
            </div>

            <iron-ajax bubbles="" id="getUsersAjax" url="/api/v1/users" on-response="handleGetUsersResponse"></iron-ajax>
`;
    }

    protected users: any[] = [];

    private get getUsersAjax(): IronAjaxElement {
        return this.$.getUsersAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }

    protected refresh() {
        this.getUsersAjax.generateRequest();
    }

    protected handleGetUsersResponse(e: CustomEvent) {
        this.users = e.detail.response;
    }

    protected onEditUserClicked(e: any) {
        // Don't navigate to "#!"
        e.preventDefault();
    }

    protected onDeleteUserClicked(e: any) {
        // Don't navigate to "#!"
        e.preventDefault();
    }

    protected onCreateUserClicked() {
        // TODO
    }

}
