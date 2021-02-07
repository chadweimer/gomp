'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { Recipe, SearchState } from '../models/models.js';
import { TagInput } from './tag-input.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-spinner/paper-spinner.js';
import './tag-input.js';
import '../shared-styles.js';

@customElement('recipe-edit')
export class RecipeEdit extends GompBaseElement {
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
                  <paper-input label="Name" always-float-label value="{{recipe.name}}"></paper-input>
                  <form id="mainImageForm" enctype="multipart/form-data">
                      <paper-input-container hidden\$="[[recipeId]]" always-float-label>
                          <label slot="label">Picture</label>
                          <iron-input slot="input">
                              <input id="mainImage" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                          </iron-input>
                      </paper-input-container>
                  </form>
                  <paper-textarea label="Serving Size" always-float-label value="{{recipe.servingSize}}"></paper-textarea>
                  <paper-textarea label="Ingredients" always-float-label value="{{recipe.ingredients}}"></paper-textarea>
                  <paper-textarea label="Directions" always-float-label value="{{recipe.directions}}"></paper-textarea>
                  <paper-textarea label="Storage/Freezer Instructions" always-float-label value="{{recipe.storageInstructions}}"></paper-textarea>
                  <paper-textarea label="Nutrition" always-float-label value="{{recipe.nutritionInfo}}"></paper-textarea>
                  <paper-input label="Source" always-float-label value="{{recipe.sourceUrl}}"></paper-input>
                  <tag-input id="tagsInput" tags="{{recipe.tags}}"></tag-input>
              </div>
              <div class="card-actions">
                  <paper-button on-click="onCancelButtonClicked">Cancel</paper-button>
                  <paper-button on-click="onSaveButtonClicked">Save</paper-button>
              </div>
          </paper-card>
          <paper-dialog id="uploadingDialog" with-backdrop>
              <h3><paper-spinner active></paper-spinner>Uploading</h3>
          </paper-dialog>

          <iron-ajax bubbles auto id="getAjax" url="/api/v1/recipes/[[recipeId]]" on-request="handleGetRecipeRequest" on-response="handleGetRecipeResponse"></iron-ajax>
          <iron-ajax bubbles id="putAjax" url="/api/v1/recipes/[[recipeId]]" method="PUT" on-response="handlePutRecipeResponse"></iron-ajax>
          <iron-ajax bubbles id="postAjax" url="/api/v1/recipes" method="POST" on-response="handlePostRecipeResponse"></iron-ajax>
          <iron-ajax bubbles id="addImageAjax" url="/api/v1/recipes/[[newRecipeId]]/images" method="POST" on-request="handleAddImageRequest" on-response="handleAddImageResponse" on-error="handleAddImageResponse"></iron-ajax>
`;
    }

    @property({type: String})
    public recipeId: string|null = null;

    protected newRecipeId = NaN;
    protected recipe: Recipe = null;

    private get tagsInput(): TagInput {
        return this.$.tagsInput as TagInput;
    }
    private get mainImage(): HTMLInputElement {
        return this.$.mainImage as HTMLInputElement;
    }
    private get mainImageForm(): HTMLFormElement {
        return this.$.mainImageForm as HTMLFormElement;
    }
    private get uploadingDialog(): PaperDialogElement {
        return this.$.uploadingDialog as PaperDialogElement;
    }
    private get getAjax(): IronAjaxElement {
        return this.$.getAjax as IronAjaxElement;
    }
    private get putAjax(): IronAjaxElement {
        return this.$.putAjax as IronAjaxElement;
    }
    private get postAjax(): IronAjaxElement {
        return this.$.postAjax as IronAjaxElement;
    }
    private get addImageAjax(): IronAjaxElement {
        return this.$.addImageAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        if (this.isActive) {
            this.tagsInput.refresh();
        }
    }
    public refresh() {
        if (!this.recipeId) {
            return;
        }

        this.getAjax.generateRequest();
        this.tagsInput.refresh();
    }

    protected isActiveChanged(isActive: boolean) {
        this.newRecipeId = NaN;
        this.mainImage.value = '';
        if (!this.recipeId) {
            this.recipe = {
                id: null,
                name: '',
                state: SearchState.Active,
                createdAt: null,
                modifiedAt: null,
                servingSize: '',
                ingredients: '',
                directions: '',
                nutritionInfo: '',
                sourceUrl: '',
                storageInstructions: '',
                tags: [],
                averageRating: 0,
            };
        }
        if (isActive && this.isReady) {
            this.tagsInput.refresh();
        }
    }
    protected onCancelButtonClicked() {
        this.dispatchEvent(new CustomEvent('recipe-edit-cancel'));
    }
    protected onSaveButtonClicked() {
        if (this.recipeId) {
            this.putAjax.body = JSON.stringify(this.recipe) as any;
            this.putAjax.generateRequest();
        } else {
            this.postAjax.body = JSON.stringify(this.recipe) as any;
            this.postAjax.generateRequest();
        }
    }
    protected handleGetRecipeRequest() {
        if (this.recipeId) {
            this.recipe = null;
        }
    }
    protected handleGetRecipeResponse(e: CustomEvent) {
        this.recipe = e.detail.response;
    }
    protected handlePutRecipeResponse() {
        this.onSaveComplete();
    }
    protected handlePostRecipeResponse(e: CustomEvent) {
        const temp = document.createElement('a');
        temp.href = e.detail.xhr.getResponseHeader('Location');
        const path = temp.pathname;

        this.newRecipeId = NaN;
        const newRecipeIdMatch = path.match(/\/api\/v1\/recipes\/(\d+)/);
        if (newRecipeIdMatch) {
            this.newRecipeId = parseInt(newRecipeIdMatch[1], 10);
        }

        if (this.mainImage.value) {
            this.addImageAjax.body = new FormData(this.mainImageForm);
            this.addImageAjax.generateRequest();
        } else {
            this.onSaveComplete();
        }
    }
    protected handleAddImageRequest() {
        this.uploadingDialog.open();
    }
    protected handleAddImageResponse() {
        this.uploadingDialog.close();
        this.onSaveComplete();
    }
    protected onSaveComplete() {
        this.dispatchEvent(new CustomEvent('recipe-edit-save', {detail: this.newRecipeId ? {redirectUrl: '/recipes/' + this.newRecipeId + '/view'} : null}));
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
}
