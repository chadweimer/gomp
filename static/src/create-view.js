import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import './mixins/gomp-core-mixin.js';
import './components/recipe-edit.js';
import './shared-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class CreateView extends GompCoreMixin(GestureEventListeners(PolymerElement)) {
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
