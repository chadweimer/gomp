import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompCoreMixin } from '../mixins/gomp-core-mixin.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@cwmr/paper-autocomplete/paper-autocomplete.js';
import '../shared-styles.js';

@customElement('recipe-link-dialog')
export class RecipeLinkDialog extends GompCoreMixin(PolymerElement) {
    static get template() {
        return html`
            <style include="shared-styles">
                paper-dialog h3 {
                    color: var(--paper-indigo-500);
                }
                paper-dialog h3 > span {
                    padding-left: 0.25em;
                }
                @media screen and (min-width: 993px) {
                    paper-dialog {
                        width: 33%;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    paper-dialog {
                        width: 75%;
                    }
                }
                @media screen and (max-width: 600px) {
                    paper-dialog {
                        width: 100%;
                    }
                }
          </style>

          <paper-dialog id="dialog" on-iron-overlay-closed="_onDialogClosed" with-backdrop="">
              <h3><iron-icon icon="icons:link"></iron-icon> <span>Link to Another Recipe</span></h3>
              <paper-autocomplete id="recipeSearcher" label="Find Recipe" on-autocomplete-change="_onAutocompleteChange" on-autocomplete-selected="_onAutocompleteSelected" remote-source="" show-results-on-focus="" required=""></paper-autocomplete>
              <div class="buttons">
                  <paper-button dialog-dismiss="">Cancel</paper-button>
                  <paper-button disabled="[[_shouldPreventAdd(_selectedRecipeId)]]" dialog-confirm="">Add</paper-button>
              </div>
          </paper-dialog>

          <iron-ajax bubbles="" id="recipesAjax" url="/api/v1/recipes" on-response="_handleGetRecipesResponse"></iron-ajax>
          <iron-ajax bubbles="" id="postLinkAjax" url="/api/v1/recipes/[[recipeId]]/links" method="POST" on-response="_handlePostLinkResponse" on-error="_handlePostLinkError"></iron-ajax>
`;
    }

    @property({type: String})
    recipeId = '';
    @property({type: Number})
    _selectedRecipeId: Number|null = null;

    open() {
        let recipeSearcher = this.$.recipeSearcher as any;
        recipeSearcher.suggestions([]);
        recipeSearcher.clear();

        let dialog = this.$.dialog as PaperDialogElement;
        dialog.open();
    }

    _onAutocompleteChange(e: CustomEvent) {
        this._selectedRecipeId = null;
        let value = e.detail.text;
        if (value && value.length >= 2) {
            let recipesAjax = this.$.recipesAjax as IronAjaxElement;
            recipesAjax.params = {
                'q': value,
                'fields[]': ['name'],
                'tags[]': [],
                'sort': 'name',
                'dir': 'asc',
                'page': 1,
                'count': 20,
            };
            recipesAjax.generateRequest();
        }
    }
    _onAutocompleteSelected(e: CustomEvent) {
        this._selectedRecipeId = e.detail.value;
    }
    _onDialogClosed(e: CustomEvent) {
        if (!e.detail.canceled) {
            let postLinkAjax = this.$.postLinkAjax as IronAjaxElement;
            postLinkAjax.body = <any>JSON.stringify(this._selectedRecipeId);
            postLinkAjax.generateRequest();
        }
    }
    _shouldPreventAdd(selectedRecipeId: Number) {
        return selectedRecipeId === null;
    }
    _handleGetRecipesResponse(e: CustomEvent) {
        let recipes = e.detail.response.recipes;

        let suggestions: any[] = [];
        if (recipes) {
            recipes.forEach(function(recipe: any) {
                suggestions.push({value: recipe.id, text: recipe.name});
            });
        }

        let recipeSearcher = this.$.recipeSearcher as any;
        recipeSearcher.suggestions(suggestions);
    }
    _handlePostLinkResponse() {
        this.dispatchEvent(new CustomEvent('link-added'));
        this.showToast('Link created.');
    }
    _handlePostLinkError() {
        this.showToast('Creating link failed!');
    }
}
