'use strict'
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompCoreMixin } from '../mixins/gomp-core-mixin.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@cwmr/paper-chip/paper-chips-section.js';
import '@cwmr/paper-divider/paper-divider.js';
import './recipe-rating.js';
import '../shared-styles.js';
import { ConfirmationDialog } from './confirmation-dialog.js';

@customElement('recipe-display')
export class RecipeDisplay extends GompCoreMixin(PolymerElement) {
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
                  <section hidden\$="[[_isEmpty(links)]]">
                      <label>Related Recipes</label>
                      <template is="dom-repeat" items="[[links]]">
                          <paper-icon-item>
                              <img src="[[item.thumbnailUrl]]" class="avatar" slot="item-icon">
                              <paper-item-body>
                                  <a href="/recipes/[[item.id]]">[[item.name]]</a>
                              </paper-item-body>
                              <iron-icon icon="icons:cancel" on-click="_onRemoveLinkClicked"></iron-icon>
                          </paper-icon-item>
                      </template>
                      <paper-divider></paper-divider>
                  </section>
                  <paper-chips-section labels="[[recipe.tags]]"></paper-chips-section>
              </div>
          </paper-card>

          <confirmation-dialog id="confirmDeleteLinkDialog" icon="delete" title="Delete Link?" message="Are you sure you want to delete this link?" on-confirmed="_deleteLink"></confirmation-dialog>

          <iron-ajax bubbles="" auto="" id="getAjax" url="/api/v1/recipes/[[recipeId]]" on-request="_handleGetRecipeRequest" on-response="_handleGetRecipeResponse"></iron-ajax>
          <iron-ajax bubbles="" auto="" id="mainImageAjax" url="/api/v1/recipes/[[recipeId]]/image" on-request="_handleGetMainImageRequest" on-response="_handleGetMainImageResponse"></iron-ajax>
          <iron-ajax bubbles="" auto="" id="getLinksAjax" url="/api/v1/recipes/[[recipeId]]/links" on-response="_handleGetLinksResponse"></iron-ajax>
          <iron-ajax bubbles="" id="deleteLinkAjax" method="DELETE" on-response="_handleDeleteLinkResponse" on-error="_handleDeleteLinkError"></iron-ajax>
`;
    }

    @property({type: String})
    recipeId = '';

    recipe: Object|null = null;
    mainImage: Object|null = null;
    links: any[] = [];

    refresh(options: any) {
        if (!this.recipeId) {
            return;
        }

        if (!options || options.recipe) {
            (<IronAjaxElement>this.$.getAjax).generateRequest();
        }
        if (!options || options.links) {
            (<IronAjaxElement>this.$.getLinksAjax).generateRequest();
        }
        if (!options || options.mainImage) {
            (<IronAjaxElement>this.$.mainImageAjax).generateRequest();
        }
    }

    _isEmpty(arr: any[]) {
        return !Array.isArray(arr) || !arr.length;
    }

    _onRemoveLinkClicked(e: any) {
        let confirmDeleteLinkDialog = this.$.confirmDeleteLinkDialog as ConfirmationDialog;
        confirmDeleteLinkDialog.dataset.id = e.model.item.id;
        confirmDeleteLinkDialog.open();
    }
    _deleteLink(e: any) {
        let deleteLinkAjax = this.$.deleteLinkAjax as IronAjaxElement;
        deleteLinkAjax.url = '/api/v1/recipes/' + this.recipeId + '/links/' + e.target.dataset.id;
        deleteLinkAjax.generateRequest();
    }

    _handleGetRecipeRequest() {
        this.recipe = null;
    }
    _handleGetRecipeResponse(e: CustomEvent) {
        this.recipe = e.detail.response;
    }
    _handleGetMainImageRequest() {
        this.mainImage = null;
    }
    _handleGetMainImageResponse(e: CustomEvent) {
        this.mainImage = e.detail.response;
    }
    _handleGetLinksResponse(e: CustomEvent) {
        this.links = e.detail.response;
    }
    _handleDeleteLinkResponse() {
        this.refresh({links: true});
    }
    _handleDeleteLinkError() {
        this.showToast('Removing link failed!');
    }
}
