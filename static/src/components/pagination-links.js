import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';
import '../shared-styles.js';
class PaginationLinks extends PolymerElement {
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
                    font-weight: 600;
                    text-transform: lowercase;
                }
                paper-button:not([disabled]) {
                    color: #ffffff;
                    background: var(--light-accent-color);
                }
          </style>

          <paper-button id="first" raised="" on-tap="_goFirst">|&lt;</paper-button>
          <paper-button id="prev" raised="" on-tap="_goPrev">&lt;</paper-button>
          <paper-button raised="" disabled="">[[pageNum]] of [[numPages]]</paper-button>
          <paper-button id="next" raised="" on-tap="_goNext">&gt;</paper-button>
          <paper-button id="last" raised="" on-tap="_goLast">&gt;|</paper-button>
`;
    }

    static get is() { return 'pagination-links'; }
    static get properties() {
        return {
            pageNum: {
                type: Number,
                value: 1,
                notify: true,
            },
            numPages: {
                type: Number,
                value: 10,
                notify: true,
            },
        };
    }
    static get observers() {
        return [
            '_pagesChanged(pageNum, numPages)',
        ];
    }

    _pagesChanged() {
        this.$.first.disabled = this.pageNum === 1;
        this.$.prev.disabled = this.pageNum === 1;
        this.$.next.disabled = this.pageNum === this.numPages;
        this.$.last.disabled = this.pageNum === this.numPages;
    }
    _goFirst(e) {
        this.pageNum = 1;
    }
    _goPrev(e) {
        this.pageNum--;
    }
    _goNext(e) {
        this.pageNum++;
    }
    _goLast(e) {
        this.pageNum = this.numPages;
    }
}
window.customElements.define(PaginationLinks.is, PaginationLinks);
