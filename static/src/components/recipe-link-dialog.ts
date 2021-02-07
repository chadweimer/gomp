'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { RecipeCompact } from '../models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-autocomplete/paper-autocomplete.js';
import '../shared-styles.js';

@customElement('recipe-link-dialog')
export class RecipeLinkDialog extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                paper-dialog h3 > span {
                    padding-left: 0.25em;
                }
          </style>

          <paper-dialog id="dialog" on-iron-overlay-closed="onDialogClosed" with-backdrop>
              <h3 class="indigo"><iron-icon icon="icons:link"></iron-icon> <span>Link to Another Recipe</span></h3>
              <paper-autocomplete id="recipeSearcher" label="Find Recipe" on-autocomplete-change="onAutocompleteChange" on-autocomplete-selected="onAutocompleteSelected" remote-source show-results-on-focus required></paper-autocomplete>
              <div class="buttons">
                  <paper-button dialog-dismiss>Cancel</paper-button>
                  <paper-button disabled="[[shouldPreventAdd(selectedRecipeId)]]" dialog-confirm>Add</paper-button>
              </div>
          </paper-dialog>

          <iron-ajax bubbles id="recipesAjax" url="/api/v1/recipes" on-response="handleGetRecipesResponse"></iron-ajax>
          <iron-ajax bubbles id="postLinkAjax" url="/api/v1/recipes/[[recipeId]]/links" method="POST" on-response="handlePostLinkResponse" on-error="handlePostLinkError"></iron-ajax>
`;
    }

    @property({type: String})
    public recipeId = '';
    @property({type: Number})
    public selectedRecipeId: number|null = null;

    private get dialog(): PaperDialogElement {
        return this.$.dialog as PaperDialogElement;
    }
    private get recipesAjax(): IronAjaxElement {
        return this.$.recipesAjax as IronAjaxElement;
    }
    private get postLinkAjax(): IronAjaxElement {
        return this.$.postLinkAjax as IronAjaxElement;
    }

    public open() {
        const recipeSearcher = this.$.recipeSearcher as any;
        recipeSearcher.suggestions([]);
        recipeSearcher.clear();

        this.dialog.open();
    }

    protected onAutocompleteChange(e: CustomEvent<{text: string}>) {
        this.selectedRecipeId = null;
        const value = e.detail.text;
        if (value && value.length >= 2) {
            this.recipesAjax.params = {
                'q': value,
                'fields[]': ['name'],
                'tags[]': [],
                'sort': 'name',
                'dir': 'asc',
                'page': 1,
                'count': 20,
            };
            this.recipesAjax.generateRequest();
        }
    }
    protected onAutocompleteSelected(e: CustomEvent<{value: number}>) {
        this.selectedRecipeId = e.detail.value;
    }
    protected onDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (!e.detail.canceled && e.detail.confirmed) {
            this.postLinkAjax.body = JSON.stringify(this.selectedRecipeId) as any;
            this.postLinkAjax.generateRequest();
        }
    }
    protected shouldPreventAdd(selectedRecipeId: number) {
        return selectedRecipeId === null;
    }
    protected handleGetRecipesResponse(e: CustomEvent<{response: {recipes: RecipeCompact[]; total: number}}>) {
        const recipes = e.detail.response.recipes;

        const suggestions: {value: number; text: string;}[] = [];
        if (recipes) {
            recipes.forEach(recipe => {
                suggestions.push({value: recipe.id, text: recipe.name});
            });
        }

        const recipeSearcher = this.$.recipeSearcher as any;
        recipeSearcher.suggestions(suggestions);
    }
    protected handlePostLinkResponse() {
        this.dispatchEvent(new CustomEvent('link-added'));
        this.showToast('Link created.');
    }
    protected handlePostLinkError() {
        this.showToast('Creating link failed!');
    }
}
