'use strict';
import { customElement } from '@polymer/decorators';
import { html } from '@polymer/polymer/polymer-element.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import './components/recipe-edit.js';
import './shared-styles.js';

@customElement('create-view')
export class CreateView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                    color: var(--primary-text-color);
                }
                article {
                    padding: 8px;
                }
            </style>

            <article>
                <h4>New Recipe</h4>
                <recipe-edit is-active="[[isActive]]" on-recipe-edit-cancel="_editCanceled" on-recipe-edit-save="_editSaved"></recipe-edit>
            </article>
`;
    }

    protected _editCanceled() {
        this.dispatchEvent(
            new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/search'}}));
    }
    protected _editSaved(e: CustomEvent) {
        this.dispatchEvent(
            new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: e.detail.redirectUrl}}));
    }
}
