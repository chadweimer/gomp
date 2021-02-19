'use strict';
import { Dialog } from '@material/mwc-dialog';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { RecipeCompact } from '../models/models.js';
import '@cwmr/paper-autocomplete/paper-autocomplete.js';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
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

          <mwc-dialog id="dialog" heading="Link to Another Recipe" on-closed="onDialogClosed">
              <paper-autocomplete id="recipeSearcher" label="Find Recipe" on-autocomplete-change="onAutocompleteChange" on-autocomplete-selected="onAutocompleteSelected" remote-source show-results-on-focus required></paper-autocomplete>
              <mwc-button slot="primaryAction" label="Add" dialogAction="add"></mwc-button>
              <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
          </mwc-dialog>
`;
    }

    @property({type: String})
    public recipeId = '';
    @property({type: Number})
    public selectedRecipeId: number|null = null;

    private get dialog(): Dialog {
        return this.$.dialog as Dialog;
    }

    public open() {
        const recipeSearcher = this.$.recipeSearcher as any;
        recipeSearcher.suggestions([]);
        recipeSearcher.clear();

        this.dialog.show();
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
    protected async onDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action !== 'add') {
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
