'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperButtonElement } from '@polymer/paper-button/paper-button.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
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

          <paper-icon-button id="first" icon="icpns:first-page" raised="" on-click="goFirst"></paper-icon-button>
          <paper-icon-button id="prev" icon="icons:chevron-left" raised="" on-click="goPrev"></paper-icon-button>
          <paper-button raised="" disabled="">[[pageNum]] of [[numPages]]</paper-button>
          <paper-icon-button id="next" icon="icons:chevron-right" raised="" on-click="goNext"></paper-icon-button>
          <paper-icon-button id="last" icon="icons:last-page" raised="" on-click="goLast"></paper-icon-button>
`;
    }

    @property({type: Number, notify: true})
    public pageNum = 1;
    @property({type: Number, notify: true})
    public numPages = 10;

    private get first(): PaperButtonElement {
        return this.$.first as PaperButtonElement;
    }
    private get prev(): PaperButtonElement {
        return this.$.prev as PaperButtonElement;
    }
    private get next(): PaperButtonElement {
        return this.$.next as PaperButtonElement;
    }
    private get last(): PaperButtonElement {
        return this.$.last as PaperButtonElement;
    }

    static get observers() {
        return [
            'pagesChanged(pageNum, numPages)',
        ];
    }

    protected pagesChanged() {
        this.first.disabled = this.pageNum === 1;
        this.prev.disabled = this.pageNum === 1;
        this.next.disabled = this.pageNum === this.numPages;
        this.last.disabled = this.pageNum === this.numPages;
    }
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
