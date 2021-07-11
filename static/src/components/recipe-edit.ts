import { Dialog } from '@material/mwc-dialog';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { Recipe, RecipeState } from '../models/models.js';
import { TagInput } from './tag-input.js';
import '@material/mwc-circular-progress';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
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
                #uploadingDialog {
                    --mdc-dialog-min-width: unset;
                }
                .padded {
                    padding: 5px 0;
                }
                label {
                    color: var(--secondary-text-color);
                    font-size: 12px;
                }
            </style>

            <paper-card>
                <div class="card-content">
                    <paper-input label="Name" always-float-label value="{{recipe.name}}"></paper-input>
                    <form id="mainImageForm" enctype="multipart/form-data">
                        <div hidden\$="[[recipeid]]" class="padded">
                            <label>Picture</label>
                            <div class="padded">
                                <input id="mainImage" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                            </div>
                            <li divider role="separator"></li>
                        </div>
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
                    <mwc-button label="Cancel" dialog-dismiss on-click="onCancelButtonClicked"></mwc-button>
                    <mwc-button label="Save" dialog-confirm on-click="onSaveButtonClicked"></mwc-button>
                </div>
            </paper-card>
            <mwc-dialog id="uploadingDialog" heading="Uploading" hideActions>
                <mwc-circular-progress indeterminate></mwc-circular-progress>
            </mwc-dialog>
`;
    }

    @query('#tagsInput')
    private tagsInput!: TagInput;
    @query('#mainImage')
    private mainImage!: HTMLInputElement;
    @query('#mainImageForm')
    private mainImageForm!: HTMLFormElement;
    @query('#uploadingDialog')
    private uploadingDialog!: Dialog;

    @property({type: String})
    public recipeId: string|null = null;

    protected recipe: Recipe|null = null;

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }
    public async refresh() {
        if (!this.recipeId) {
            this.recipe = {
                name: '',
                state: RecipeState.Active,
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
                    this.uploadingDialog.show();
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
