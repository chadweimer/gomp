'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@cwmr/paper-chip/paper-chips-section.js';
import '@cwmr/paper-divider/paper-divider.js';
import './confirmation-dialog.js';
import './recipe-rating.js';
import '../shared-styles.js';

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
                .avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 1px solid rgba(0, 0, 0, 0.25);
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
            </style>

            <paper-card>
                <div class="card-content">
                    <recipe-rating recipe="{{recipe}}"></recipe-rating>
                    <h2>
                        <a target="_blank" href\$="[[mainImage.url]]"><img src="[[mainImage.thumbnailUrl]]" alt="Main Image" class="main-image" hidden\$="[[!mainImage.thumbnailUrl]]"></a>
                        [[recipe.name]]
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
                            <paper-icon-item>
                                <img src="[[item.thumbnailUrl]]" class="avatar" slot="item-icon">
                                <paper-item-body>
                                    <a href="/recipes/[[item.id]]">[[item.name]]</a>
                                </paper-item-body>
                                <iron-icon icon="icons:cancel" on-click="onRemoveLinkClicked"></iron-icon>
                            </paper-icon-item>
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

          <confirmation-dialog id="confirmDeleteLinkDialog" icon="delete" title="Delete Link?" message="Are you sure you want to delete this link?" on-confirmed="deleteLink"></confirmation-dialog>

          <iron-ajax bubbles="" auto="" id="getAjax" url="/api/v1/recipes/[[recipeId]]" on-request="handleGetRecipeRequest" on-response="handleGetRecipeResponse"></iron-ajax>
          <iron-ajax bubbles="" auto="" id="mainImageAjax" url="/api/v1/recipes/[[recipeId]]/image" on-request="handleGetMainImageRequest" on-response="handleGetMainImageResponse"></iron-ajax>
          <iron-ajax bubbles="" auto="" id="getLinksAjax" url="/api/v1/recipes/[[recipeId]]/links" on-response="handleGetLinksResponse"></iron-ajax>
          <iron-ajax bubbles="" id="deleteLinkAjax" method="DELETE" on-response="handleDeleteLinkResponse" on-error="handleDeleteLinkError"></iron-ajax>
`;
    }

    @property({type: String})
    public recipeId = '';

    protected recipe: object|null = null;
    protected mainImage: object|null = null;
    protected links: any[] = [];

    private get confirmDeleteLinkDialog(): ConfirmationDialog {
        return this.$.confirmDeleteLinkDialog as ConfirmationDialog;
    }
    private get getAjax(): IronAjaxElement {
        return this.$.getAjax as IronAjaxElement;
    }
    private get getLinksAjax(): IronAjaxElement {
        return this.$.getLinksAjax as IronAjaxElement;
    }
    private get mainImageAjax(): IronAjaxElement {
        return this.$.mainImageAjax as IronAjaxElement;
    }
    private get deleteLinkAjax(): IronAjaxElement {
        return this.$.deleteLinkAjax as IronAjaxElement;
    }

    public refresh(options?: {recipe?: boolean, links?: boolean, mainImage?: boolean}) {
        if (!this.recipeId) {
            return;
        }

        if (!options || options.recipe) {
            this.getAjax.generateRequest();
        }
        if (!options || options.links) {
            this.getLinksAjax.generateRequest();
        }
        if (!options || options.mainImage) {
            this.mainImageAjax.generateRequest();
        }
    }

    protected isEmpty(arr: any[]) {
        return !Array.isArray(arr) || !arr.length;
    }

    protected onRemoveLinkClicked(e: any) {
        this.confirmDeleteLinkDialog.dataset.id = e.model.item.id;
        this.confirmDeleteLinkDialog.open();
    }
    protected deleteLink(e: any) {
        this.deleteLinkAjax.url = '/api/v1/recipes/' + this.recipeId + '/links/' + e.target.dataset.id;
        this.deleteLinkAjax.generateRequest();
    }

    protected handleGetRecipeRequest() {
        this.recipe = null;
    }
    protected handleGetRecipeResponse(e: CustomEvent) {
        this.recipe = e.detail.response;
    }
    protected handleGetMainImageRequest() {
        this.mainImage = null;
    }
    protected handleGetMainImageResponse(e: CustomEvent) {
        this.mainImage = e.detail.response;
    }
    protected handleGetLinksResponse(e: CustomEvent) {
        this.links = e.detail.response;
    }
    protected handleDeleteLinkResponse() {
        this.refresh({links: true});
    }
    protected handleDeleteLinkError() {
        this.showToast('Removing link failed!');
    }
    protected formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleString();
    }
    protected showModifiedDate(recipe: any) {
        return recipe.modifiedAt !== recipe.createdAt;
    }
}
