import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import './mixins/gomp-core-mixin.js';
import './components/recipe-edit.js';
import './shared-styles.js';
class CreateView extends GompCoreMixin(PolymerElement) {
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

    static get is() { return 'create-view'; }

    _editCanceled(e) {
        this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/search'}}));
    }
    _editSaved(e) {
        this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: e.detail.redirectUrl}}));
    }
}

window.customElements.define(CreateView.is, CreateView);
