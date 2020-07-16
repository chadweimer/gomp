'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement } from '@polymer/decorators';
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
                    <div class="card-content"></div>
                    <div class="card-actions"></div>
                </paper-card>
            </div>
`;
    }
}
