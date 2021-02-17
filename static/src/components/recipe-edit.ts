'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { Recipe, RecipeState } from '../models/models.js';
import { TagInput } from './tag-input.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-spinner/paper-spinner.js';
import './tag-input.js';
import '../common/shared-styles.js';

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
`;
    }

    @property({type: String})
    public recipeId: string|null = null;

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

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }
    public async refresh() {
        if (!this.recipeId) {
            this.recipe = {
                id: null,
                name: '',
                state: RecipeState.Active,
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
        } else {
            this.recipe = null;
            try {
                this.recipe = await this.AjaxGetWithResult(`/api/v1/recipes/${this.recipeId}`);
            } catch (e) {
                console.error(e);
            }
        }
        await this.tagsInput.refresh();
    }

    protected isActiveChanged(isActive: boolean) {
        this.mainImage.value = '';
        if (isActive && this.isReady) {
            this.refresh();
        }
    }
    protected onCancelButtonClicked() {
        this.dispatchEvent(new CustomEvent('recipe-edit-cancel'));
    }
    protected async onSaveButtonClicked() {
        try {
            if (this.recipeId) {
                await this.AjaxPut(`/api/v1/recipes/${this.recipeId}`, this.recipe);
                this.dispatchEvent(new CustomEvent('recipe-edit-save'));
            } else {
                const location = await this.AjaxPostWithLocation('/api/v1/recipes', this.recipe);

                const temp = document.createElement('a');
                temp.href = location;
                const path = temp.pathname;

                let newRecipeId = NaN;
                const newRecipeIdMatch = path.match(/\/api\/v1\/recipes\/(\d+)/);
                if (newRecipeIdMatch) {
                    newRecipeId = parseInt(newRecipeIdMatch[1], 10);
                } else {
                    throw new Error(`Unexpected path: ${path}`);
                }

                if (this.mainImage.value) {
                    this.uploadingDialog.open();
                    await this.AjaxPost(`/api/v1/recipes/${newRecipeId}/images`, new FormData(this.mainImageForm));
                    this.uploadingDialog.close();
                }
                this.dispatchEvent(new CustomEvent('recipe-edit-save', {detail: {redirectUrl: `/recipes/${newRecipeId}/view`}}));
            }
            this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
        } catch (e) {
            this.uploadingDialog.close();
            console.error(e);
        }
    }
}
