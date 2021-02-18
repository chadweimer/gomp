'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import '@material/mwc-icon';
import '@polymer/paper-button/paper-button.js';
import '../common/shared-styles.js';

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

          <paper-button raised disabled\$="[[areEqual(pageNum, 1)]]" on-click="goFirst"><mwc-icon>first_page</mwc-icon></paper-button>
          <paper-button raised disabled\$="[[areEqual(pageNum, 1)]]" on-click="goPrev"><mwc-icon>chevron_left</mwc-icon></paper-button>
          <paper-button raised disabled>[[pageNum]] of [[numPages]]</paper-button>
          <paper-button raised disabled\$="[[areEqual(pageNum, numPages)]]" on-click="goNext"><mwc-icon>chevron_right</mwc-icon></paper-button>
          <paper-button raised disabled\$="[[areEqual(pageNum, numPages)]]" on-click="goLast"><mwc-icon>last_page</mwc-icon></paper-button>
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
