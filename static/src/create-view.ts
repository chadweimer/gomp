import { customElement, property } from '@polymer/decorators';
import { html } from '@polymer/polymer/polymer-element.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { User } from './models/models.js';
import './common/shared-styles.js';
import './components/recipe-edit.js';

@customElement('create-view')
export class CreateView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
            </style>

            <div class="container-wide padded-10">
                <h4>New Recipe</h4>
                <recipe-edit is-active="[[isActive]]" on-recipe-edit-cancel="editCanceled" on-recipe-edit-save="editSaved"></recipe-edit>
            </div>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User|null = null;

    protected editCanceled() {
        this.navigateTo('/search');
    }
    protected editSaved(e: CustomEvent<{redirectUrl: string}>) {
        this.navigateTo(e.detail.redirectUrl);
    }
}
