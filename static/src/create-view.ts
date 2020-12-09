'use strict';
import { customElement, property } from '@polymer/decorators';
import { html } from '@polymer/polymer/polymer-element.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { User } from './models/models.js';
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
                <recipe-edit is-active="[[isActive]]" on-recipe-edit-cancel="editCanceled" on-recipe-edit-save="editSaved"></recipe-edit>
            </article>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User = null;

    protected editCanceled() {
        this.dispatchEvent(
            new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/search'}}));
    }
    protected editSaved(e: CustomEvent<{redirectUrl: string}>) {
        this.dispatchEvent(
            new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: e.detail.redirectUrl}}));
    }
}
