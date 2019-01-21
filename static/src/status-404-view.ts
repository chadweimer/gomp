'use strict'
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement } from '@polymer/decorators';
import './shared-styles.js';

@customElement('status-404-view')
export class Status404View extends PolymerElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                    padding: 8px;
                }
            </style>

            <span>Could not locate the requested resource.</span>
`;
    }
}
