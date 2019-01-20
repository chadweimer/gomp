import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-autocomplete/paper-autocomplete.js';
import '../mixins/gomp-core-mixin.js';
import '../shared-styles.js';
class RecipeLinkDialog extends GompCoreMixin(PolymerElement) {
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

    static get is() { return 'recipe-link-dialog'; }
    static get properties() {
        return {
            recipeId: {
                type: String,
            },
            _selectedRecipeId: {
                type: Number,
                value: null,
            },
        };
    }

    open() {
        this.$.recipeSearcher.suggestions([]);
        this.$.recipeSearcher.clear();
        this.$.dialog.open();
    }

    _onAutocompleteChange(e) {
        this._selectedRecipeId = null;
        var value = e.detail.text;
        if (value && value.length >= 2) {
            this.$.recipesAjax.params = {
                'q': value,
                'fields[]': ['name'],
                'tags[]': [],
                'sort': 'name',
                'dir': 'asc',
                'page': 1,
                'count': 20,
            };
            this.$.recipesAjax.generateRequest();
        }
    }
    _onAutocompleteSelected(e) {
        this._selectedRecipeId = e.detail.value;
    }
    _onDialogClosed(e) {
        if (!e.detail.canceled) {
            this.$.postLinkAjax.body = JSON.stringify(this._selectedRecipeId);
            this.$.postLinkAjax.generateRequest();
        }
    }
    _shouldPreventAdd(selectedRecipeId) {
        return !selectedRecipeId;
    }
    _handleGetRecipesResponse(e) {
        var recipes = e.detail.response.recipes;

        var suggestions = [];
        if (recipes) {
            recipes.forEach(function(recipe) {
                suggestions.push({value: recipe.id, text: recipe.name});
            });
        }
        this.$.recipeSearcher.suggestions(suggestions);
    }
    _handlePostLinkResponse(e) {
        this.dispatchEvent(new CustomEvent('link-added'));
        this.showToast('Link created.');
    }
    _handlePostLinkError(e) {
        this.showToast('Creating link failed!');
    }
}

window.customElements.define(RecipeLinkDialog.is, RecipeLinkDialog);
