import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import '@material/mwc-button';
import '@material/mwc-icon';
import '../common/shared-styles.js';

@customElement('pagination-links')
export class PaginationLinks extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: inline-block;
                }
                :host[hidden] {
                    display: none !important;
                }
          </style>

          <mwc-button raised disabled\$="[[areEqual(pageNum, 1)]]" on-click="goFirst"><mwc-icon>first_page</mwc-icon></mwc-button>
          <mwc-button raised disabled\$="[[areEqual(pageNum, 1)]]" on-click="goPrev"><mwc-icon>chevron_left</mwc-icon></mwc-button>
          <mwc-button raised disabled>[[pageNum]] of [[numPages]]</mwc-button>
          <mwc-button raised disabled\$="[[areEqual(pageNum, numPages)]]" on-click="goNext"><mwc-icon>chevron_right</mwc-icon></mwc-button>
          <mwc-button raised disabled\$="[[areEqual(pageNum, numPages)]]" on-click="goLast"><mwc-icon>last_page</mwc-icon></mwc-button>
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
