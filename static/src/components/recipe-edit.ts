import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompCoreMixin } from '../mixins/gomp-core-mixin.js';
import { TagInput } from './tag-input.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '../shared-styles.js';

@customElement('recipe-edit')
export class RecipeEdit extends GompCoreMixin(PolymerElement) {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    --paper-card: {
                        width: 100%;
                    }
                }
          </style>

          <paper-card>
              <div class="card-content">
                  <paper-input label="Name" always-float-label="" value="{{recipe.name}}"></paper-input>
                  <form id="mainImageForm" enctype="multipart/form-data">
                      <paper-input-container hidden\$="[[recipeId]]" always-float-label="">
                          <label slot="label">Picture</label>
                          <iron-input slot="input">
                              <input id="mainImage" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                          </iron-input>
                      </paper-input-container>
                  </form>
                  <paper-textarea label="Serving Size" always-float-label="" value="{{recipe.servingSize}}"></paper-textarea>
                  <paper-textarea label="Ingredients" always-float-label="" value="{{recipe.ingredients}}"></paper-textarea>
                  <paper-textarea label="Directions" always-float-label="" value="{{recipe.directions}}"></paper-textarea>
                  <paper-textarea label="Nutrition" always-float-label="" value="{{recipe.nutritionInfo}}"></paper-textarea>
                  <paper-input label="Source" always-float-label="" value="{{recipe.sourceUrl}}"></paper-input>
                  <tag-input id="tagsInput" tags="{{recipe.tags}}"></tag-input>
              </div>
              <div class="card-actions">
                  <paper-button on-click="_onCancelButtonClicked">Cancel</paper-button>
                  <paper-button on-click="_onSaveButtonClicked">Save</paper-button>
              </div>
          </paper-card>
          <paper-dialog id="uploadingDialog" with-backdrop="">
              <h3><paper-spinner active=""></paper-spinner>Uploading</h3>
          </paper-dialog>

          <iron-ajax bubbles="" auto="" id="getAjax" url="/api/v1/recipes/[[recipeId]]" on-request="_handleGetRecipeRequest" on-response="_handleGetRecipeResponse"></iron-ajax>
          <iron-ajax bubbles="" id="putAjax" url="/api/v1/recipes/[[recipeId]]" method="PUT" on-response="_handlePutRecipeResponse"></iron-ajax>
          <iron-ajax bubbles="" id="postAjax" url="/api/v1/recipes" method="POST" on-response="_handlePostRecipeResponse"></iron-ajax>
          <iron-ajax bubbles="" id="addImageAjax" url="/api/v1/recipes/[[newRecipeId]]/images" method="POST" on-request="_handleAddImageRequest" on-response="_handleAddImageResponse" ,="" on-error="_handleAddImageResponse"></iron-ajax>
`;
    }

    @property({type: String})
    recipeId: string|null = null;

    newRecipeId = NaN;
    recipe: object|null = null;

    ready() {
        super.ready();

        if (this.isActive) {
            (<TagInput>this.$.tagsInput).refresh();
        }
    }
    refresh() {
        if (!this.recipeId) {
            return;
        }

        (<IronAjaxElement>this.$.getAjax).generateRequest();
        (<TagInput>this.$.tagsInput).refresh();
    }

    _isActiveChanged(isActive: Boolean) {
        this.newRecipeId = NaN;
        (<HTMLInputElement>this.$.mainImage).value = '';
        if (!this.recipeId) {
            this.recipe = {
                name: '',
                servingSize: '',
                ingredients: '',
                directions: '',
                nutrition: '',
                sourceUrl: '',
                tags: [],
            };
        }
        if (isActive && this.isReady) {
            (<TagInput>this.$.tagsInput).refresh();
        }
    }
    _onCancelButtonClicked() {
        this.dispatchEvent(new CustomEvent('recipe-edit-cancel'));
    }
    _onSaveButtonClicked() {
        if (this.recipeId) {
            let putAjax = this.$.putAjax as IronAjaxElement;
            putAjax.body = <any>JSON.stringify(this.recipe);
            putAjax.generateRequest();
        } else {
            let postAjax = this.$.postAjax as IronAjaxElement;
            postAjax.body = <any>JSON.stringify(this.recipe);
            postAjax.generateRequest();
        }
    }
    _handleGetRecipeRequest() {
        if (this.recipeId) {
            this.recipe = null;
        }
    }
    _handleGetRecipeResponse(e: CustomEvent) {
        this.recipe = e.detail.response;
    }
    _handlePutRecipeResponse() {
        this._onSaveComplete();
    }
    _handlePostRecipeResponse(e: CustomEvent) {
        var temp = document.createElement('a');
        temp.href = e.detail.xhr.getResponseHeader('Location');
        var path = temp.pathname;

        this.newRecipeId = NaN;
        var newRecipeIdMatch = path.match(/\/api\/v1\/recipes\/(\d+)/);
        if (newRecipeIdMatch) {
            this.newRecipeId = parseInt(newRecipeIdMatch[1], 10);
        }

        if ((<HTMLInputElement>this.$.mainImage).value) {
            let addImageAjax = this.$.addImageAjax as IronAjaxElement;
            addImageAjax.body = new FormData(<HTMLFormElement>this.$.mainImageForm);
            addImageAjax.generateRequest();
        } else {
            this._onSaveComplete();
        }
    }
    _handleAddImageRequest() {
        (<PaperDialogElement>this.$.uploadingDialog).open();
    }
    _handleAddImageResponse() {
        (<PaperDialogElement>this.$.uploadingDialog).close();
        this._onSaveComplete();
    }
    _onSaveComplete() {
        this.dispatchEvent(new CustomEvent('recipe-edit-save', {detail: this.newRecipeId ? {redirectUrl: '/recipes/' + this.newRecipeId} : null}));
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
}
