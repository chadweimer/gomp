'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js':
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '../shared-styles.js';

@customElement('pagination-links')
export class PaginationLinks extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                :host[hidden] {
                    display: none !important;
                }
                paper-button {
                    vertical-align: top;
                }
                paper-button:not([disabled]) {
                    color: #ffffff;
                    background: var(--light-accent-color);
                }
          </style>

          <paper-button raised disabled\$="[[areEqual(pageNum, 1)]]" on-click="goFirst"><iron-icon icon="icons:first-page"></iron-icon></paper-button>
          <paper-button raised disabled\$="[[areEqual(pageNum, 1)]]" on-click="goPrev"><iron-icon icon="icons:chevron-left"></iron-icon></paper-button>
          <paper-button raised disabled>[[pageNum]] of [[numPages]]</paper-button>
          <paper-button raised disabled\$="[[areEqual(pageNum, numPages)]]" on-click="goNext"><iron-icon icon="icons:chevron-right"></iron-icon></paper-button>
          <paper-button raised disabled\$="[[areEqual(pageNum, numPages)]]" on-click="goLast"><iron-icon icon="icons:last-page"></iron-icon></paper-button>
`;
    }

    @property({type: Number, notify: true})
    public pageNum = 1;
    @property({type: Number, notify: true})
    public numPages = 10;

    protected goFirst() {
        this.pageNum = 1;
    }
    protected goPrev() {
        this.pageNum--;
    }
    protected goNext() {
        this.pageNum++;
    }
    protected goLast() {
        this.pageNum = this.numPages;
    }
}
