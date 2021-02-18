'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { RecipeCompact } from '../models/models.js';
import '@material/mwc-icon';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-autocomplete/paper-autocomplete.js';
import '../common/shared-styles.js';

@customElement('recipe-link-dialog')
export class RecipeLinkDialog extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                :host[hidden] {
                    display: none !important;
                }
          </style>

          <paper-dialog id="dialog" on-iron-overlay-closed="onDialogClosed" with-backdrop>
              <h3 class="indigo"><mwc-icon>link</mwc-icon> <span>Link to Another Recipe</span></h3>
              <paper-autocomplete id="recipeSearcher" label="Find Recipe" on-autocomplete-change="onAutocompleteChange" on-autocomplete-selected="onAutocompleteSelected" remote-source show-results-on-focus required></paper-autocomplete>
              <div class="buttons">
                  <paper-button dialog-dismiss>Cancel</paper-button>
                  <paper-button disabled="[[shouldPreventAdd(selectedRecipeId)]]" dialog-confirm>Add</paper-button>
              </div>
          </paper-dialog>
`;
    }

    @property({type: String})
    public recipeId = '';
    @property({type: Number})
    public selectedRecipeId: number|null = null;

    private get dialog(): PaperDialogElement {
        return this.$.dialog as PaperDialogElement;
    }

    public open() {
        const recipeSearcher = this.$.recipeSearcher as any;
        recipeSearcher.suggestions([]);
        recipeSearcher.clear();

        this.dialog.open();
    }

    protected async onAutocompleteChange(e: CustomEvent<{text: string}>) {
        this.selectedRecipeId = null;
        const value = e.detail.text;
        if (value && value.length >= 2) {
            try {
                const filterQuery = {
                    'q': value,
                    'fields[]': ['name'],
                    'tags[]': [],
                    'sort': 'name',
                    'dir': 'asc',
                    'page': 1,
                    'count': 20,
                };
                const response: {total: number, recipes: RecipeCompact[]} = await this.AjaxGetWithResult('/api/v1/recipes', filterQuery);
                const recipes = response.recipes;

                const suggestions: {value: number; text: string;}[] = [];
                if (recipes) {
                    recipes.forEach(recipe => {
                        suggestions.push({value: recipe.id, text: recipe.name});
                    });
                }

                const recipeSearcher = this.$.recipeSearcher as any;
                recipeSearcher.suggestions(suggestions);
            } catch (e) {
                console.error(e);
            }
        }
    }
    protected onAutocompleteSelected(e: CustomEvent<{value: number}>) {
        this.selectedRecipeId = e.detail.value;
    }
    protected async onDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.detail.canceled || !e.detail.confirmed) {
            return;
        }

        try {
            await this.AjaxPost(`/api/v1/recipes/${this.recipeId}/links`, this.selectedRecipeId);
            this.dispatchEvent(new CustomEvent('link-added'));
            this.showToast('Link created.');
        } catch (e) {
            this.showToast('Creating link failed!');
            console.error(e);
        }
    }
    protected shouldPreventAdd(selectedRecipeId: number) {
        return selectedRecipeId === null;
    }
}
