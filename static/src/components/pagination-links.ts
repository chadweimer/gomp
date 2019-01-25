'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperButtonElement } from '@polymer/paper-button/paper-button.js';
import '@polymer/paper-button/paper-button.js';
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

          <paper-button id="first" raised="" on-click="goFirst">|&lt;</paper-button>
          <paper-button id="prev" raised="" on-click="goPrev">&lt;</paper-button>
          <paper-button raised="" disabled="">[[pageNum]] of [[numPages]]</paper-button>
          <paper-button id="next" raised="" on-click="goNext">&gt;</paper-button>
          <paper-button id="last" raised="" on-click="goLast">&gt;|</paper-button>
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
