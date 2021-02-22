'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import { EventWithModel, Recipe, RecipeCompact } from '../models/models.js';
import '@material/mwc-icon';
import '@material/mwc-list/mwc-list-item';
import '@polymer/paper-card/paper-card.js';
import '@cwmr/paper-chip/paper-chips-section.js';
import '@cwmr/paper-divider/paper-divider.js';
import './confirmation-dialog.js';
import './recipe-rating.js';
import '../common/shared-styles.js';

@customElement('recipe-display')
export class RecipeDisplay extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    --paper-card: {
                        width: 100%;
                    }
                }
                section {
                    padding: 0.5em;
                }
                a {
                    text-transform: none;
                }
                label {
                    color: var(--secondary-text-color);
                    font-size: 0.8em;
                    font-weight: lighter;
                }
                .plain-text {
                    white-space: pre-wrap;
                }
                .main-image {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                }
                recipe-rating {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                }
                #confirmDeleteLinkDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
                .footer {
                    @apply --layout-horizontal;
                    @apply --layout-end-justified;

                    color: var(--secondary-text-color);
                    font-size: 0.8em;
                    font-weight: lighter;
                }
                .state {
                    margin-left: 1em;
                }
                .state[hidden] {
                    display: none !important;
                }
                mwc-list-item.partially-interactive {
                    --mdc-ripple-color: transparent;
                    cursor: default;
                }
            </style>

            <paper-card>
                <div class="card-content">
                    <recipe-rating recipe="{{recipe}}" readonly\$="[[readonly]]"></recipe-rating>
                    <h2>
                        <a target="_blank" href\$="[[mainImage.url]]"><img src="[[mainImage.thumbnailUrl]]" class="main-image"></a>
                        [[recipe.name]]
                        <paper-chip class="state middle-vertical" hidden\$="[[areEqual(recipe.state, 'active')]]">[[recipe.state]]</paper-chip>
                    </h2>
                    <section hidden\$="[[!recipe.servingSize]]">
                        <label>Serving Size</label>
                        <p class="plain-text">[[recipe.servingSize]]</p>
                        <paper-divider></paper-divider>
                    </section>
                    <section>
                        <label>Ingredients</label>
                        <p class="plain-text">[[recipe.ingredients]]</p>
                        <paper-divider></paper-divider>
                    </section>
                    <section>
                        <label>Directions</label>
                        <p class="plain-text">[[recipe.directions]]</p>
                        <paper-divider></paper-divider>
                    </section>
                    <section hidden\$="[[!recipe.storageInstructions]]">
                        <label>Storage/Freezer Instructions</label>
                        <p class="plain-text">[[recipe.storageInstructions]]</p>
                        <paper-divider></paper-divider>
                    </section>
                    <section hidden\$="[[!recipe.nutritionInfo]]">
                        <label>Nutrition</label>
                        <p class="plain-text">[[recipe.nutritionInfo]]</p>
                        <paper-divider></paper-divider>
                    </section>
                    <section hidden\$="[[!recipe.sourceUrl]]">
                        <label>Source</label>
                        <p class="section"><a target="_blank" href\$="[[recipe.sourceUrl]]" class="hideable-content">[[recipe.sourceUrl]]</a></p>
                        <paper-divider></paper-divider>
                    </section>
                    <section hidden\$="[[isEmpty(links)]]">
                        <label>Related Recipes</label>
                        <template is="dom-repeat" items="[[links]]">
                            <mwc-list-item class="partially-interactive" graphic="avatar" hasMeta tabindex="-1">
                                <img src="[[item.thumbnailUrl]]" slot="graphic">
                                <div class="item-inset">
                                    <a href="/recipes/[[item.id]]/view">[[item.name]]</a>
                                </div>
                                <a href="#!" slot="meta" on-click="onRemoveLinkClicked" hidden\$="[[readonly]]"><mwc-icon>cancel</mwc-icon></a>
                            </mwc-list-item>
                        </template>
                        <paper-divider></paper-divider>
                    </section>
                    <section hidden\$="[[isEmpty(recipe.tags)]]">
                        <paper-chips-section labels="[[recipe.tags]]"></paper-chips-section>
                        <paper-divider></paper-divider>
                    </section>
                    <div class="footer" >
                        <span>[[formatDate(recipe.createdAt)]]</span>
                        <span hidden\$="[[!showModifiedDate(recipe)]]">&nbsp; (edited [[formatDate(recipe.modifiedAt)]])</span>
                    </div>
                </div>
          </paper-card>

          <confirmation-dialog id="confirmDeleteLinkDialog" title="Delete Link?" message="Are you sure you want to delete this link?" on-confirmed="deleteLink"></confirmation-dialog>
`;
    }

    @property({type: String})
    public recipeId = '';

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected recipe: Recipe = null;
    protected mainImage: object|null = null;
    protected links: RecipeCompact[] = [];

    private get confirmDeleteLinkDialog(): ConfirmationDialog {
        return this.$.confirmDeleteLinkDialog as ConfirmationDialog;
    }

    public async refresh(options?: {recipe?: boolean, links?: boolean, mainImage?: boolean}) {
        if (!this.recipeId) {
            return;
        }

        if (!options || options.recipe) {
            this.recipe = null;
            try {
                this.recipe = await this.AjaxGetWithResult(`/api/v1/recipes/${this.recipeId}`);
                this.dispatchEvent(new CustomEvent('recipe-loaded', {bubbles: true, composed: true, detail: {recipe: this.recipe}}));
            } catch (e) {
                console.error(e);
            }
        }
        if (!options || options.links) {
            this.links = null;
            try {
                this.links = await this.AjaxGetWithResult(`/api/v1/recipes/${this.recipeId}/links`);
            } catch (e) {
                console.error(e);
            }
        }
        if (!options || options.mainImage) {
            this.mainImage = null;
            try {
                this.mainImage = await this.AjaxGetWithResult(`/api/v1/recipes/${this.recipeId}/image`);
            } catch (e) {
                console.error(e);
            }
        }
    }

    protected isEmpty(arr: any[]) {
        return !Array.isArray(arr) || !arr.length;
    }

    protected onRemoveLinkClicked(e: EventWithModel<{item: RecipeCompact}>) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.confirmDeleteLinkDialog.dataset.id = e.model.item.id.toString();
        this.confirmDeleteLinkDialog.show();
    }

    protected async deleteLink(e: Event) {
        const el = e.target as HTMLElement;

        try {
            await this.AjaxDelete(`/api/v1/recipes/${this.recipeId}/links/${el.dataset.id}`);
            this.showToast('Link removed.');
            await this.refresh({links: true});
        } catch (e) {
            this.showToast('Removing link failed!');
            console.error(e);
        }
    }

    protected showModifiedDate(recipe: Recipe) {
        if (!recipe) {
            return false;
        }
        return recipe.modifiedAt !== recipe.createdAt;
    }
}
