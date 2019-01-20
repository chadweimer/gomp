import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperButtonElement } from '@polymer/paper-button/paper-button.js';
import '../shared-styles.js';

@customElement('pagination-links')
export class PaginationLinks extends PolymerElement {
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

          <paper-button id="first" raised="" on-click="_goFirst">|&lt;</paper-button>
          <paper-button id="prev" raised="" on-click="_goPrev">&lt;</paper-button>
          <paper-button raised="" disabled="">[[pageNum]] of [[numPages]]</paper-button>
          <paper-button id="next" raised="" on-click="_goNext">&gt;</paper-button>
          <paper-button id="last" raised="" on-click="_goLast">&gt;|</paper-button>
`;
    }

    @property({type: Number, notify: true})
    pageNum = 1;
    @property({type: Number, notify: true})
    numPages = 10;

    static get observers() {
        return [
            '_pagesChanged(pageNum, numPages)',
        ];
    }

    _pagesChanged() {
        (<PaperButtonElement>this.$.first).disabled = this.pageNum === 1;
        (<PaperButtonElement>this.$.prev).disabled = this.pageNum === 1;
        (<PaperButtonElement>this.$.next).disabled = this.pageNum === this.numPages;
        (<PaperButtonElement>this.$.last).disabled = this.pageNum === this.numPages;
    }
    _goFirst() {
        this.pageNum = 1;
    }
    _goPrev() {
        this.pageNum--;
    }
    _goNext() {
        this.pageNum++;
    }
    _goLast() {
        this.pageNum = this.numPages;
    }
}
