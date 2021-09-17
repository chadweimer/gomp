import { Dialog } from '@material/mwc-dialog';
import { TextArea } from '@material/mwc-textarea';
import { TextField } from '@material/mwc-textfield';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { EventWithTarget, Recipe, RecipeState } from '../models/models.js';
import { TagInput } from './tag-input.js';
import '@material/mwc-circular-progress';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-textarea';
import '@material/mwc-textfield';
import '@polymer/paper-card/paper-card.js';
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
                    <p><mwc-textfield class="fill" label="Name" value="[[recipe.name]]" on-change="nameChanged"></mwc-textfield></p>
                    <form id="mainImageForm" enctype="multipart/form-data">
                        <div hidden\$="[[recipeid]]" class="padded">
                            <label>Picture</label>
                            <div class="padded">
                                <input id="mainImage" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                            </div>
                            <li divider role="separator"></li>
                        </div>
                    </form>
                    <p><mwc-textarea class="fill" label="Serving Size" value="[[recipe.servingSize]]" rows="1" on-input="onTextAreaInput" on-change="servingSizeChanged"></mwc-textarea></p>
                    <p><mwc-textarea class="fill" label="Ingredients" value="[[recipe.ingredients]]" rows="1" on-input="onTextAreaInput" on-change="ingredientsChanged"></mwc-textarea></p>
                    <p><mwc-textarea class="fill" label="Directions" value="[[recipe.directions]]" rows="1" on-input="onTextAreaInput" on-change="directionsChanged"></mwc-textarea></p>
                    <p><mwc-textarea class="fill" label="Storage/Freezer Instructions" value="[[recipe.storageInstructions]]" rows="1" on-input="onTextAreaInput" on-change="storageInstructionsChanged"></mwc-textarea></p>
                    <p><mwc-textarea class="fill" label="Nutrition" value="[[recipe.nutritionInfo]]" rows="1" on-input="onTextAreaInput" on-change="nutritionChanged"></mwc-textarea></p>
                    <p><mwc-textfield class="fill" label="Source" value="[[recipe.sourceUrl]]" on-change="sourceUrlChanged"></mwc-textfield></p>
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

    protected nameChanged(e: EventWithTarget<TextField>) {
        this.set('recipe.name', e.target.value);
    }
    protected sourceUrlChanged(e: EventWithTarget<TextField>) {
        this.set('recipe.sourceUrl', e.target.value);
    }
    protected servingSizeChanged(e: EventWithTarget<TextField>) {
        this.set('recipe.servingSize', e.target.value);
    }
    protected ingredientsChanged(e: EventWithTarget<TextField>) {
        this.set('recipe.ingredients', e.target.value);
    }
    protected directionsChanged(e: EventWithTarget<TextField>) {
        this.set('recipe.directions', e.target.value);
    }
    protected storageInstructionsChanged(e: EventWithTarget<TextField>) {
        this.set('recipe.storageInstructions', e.target.value);
    }
    protected nutritionChanged(e: EventWithTarget<TextField>) {
        this.set('recipe.nutritionInfo', e.target.value);
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

    protected async onTextAreaInput(e: EventWithTarget<TextArea>) {
        await this.hackAutoSizeTextarea(e.target);
    }
}
