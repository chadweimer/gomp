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
            </style>
            <div class="container">
                <paper-card>
                    <div class="card-content">
                        <h3>Users</h3>
                        <template is="dom-repeat" items="[[users]]">
                            <div>[[item.username]] - [[item.accessLevel]]</div>
                        </template>
                    </div>
                    <div class="card-actions"></div>
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
}
