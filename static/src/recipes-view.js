import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/editor-icons.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial-action.js';
import './mixins/gomp-core-mixin.js';
import './components/image-list.js';
import './components/note-list.js';
import './components/recipe-display.js';
import './components/recipe-edit.js';
import './components/recipe-link-dialog.js';
import './shared-styles.js';
class RecipesView extends GompCoreMixin(GestureEventListeners(PolymerElement)) {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                    color: var(--primary-text-color);
                }
                .container {
                    padding: 10px;
                }
                #confirmDeleteDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
                #actions {
                    --paper-fab-speed-dial-position: fixed;
                }
                paper-fab-speed-dial-action.green {
                    --paper-fab-speed-dial-action-background: var(--paper-green-500);
                    --paper-fab-speed-dial-action-keyboard-focus-background: var(--paper-green-900);
                }
                paper-fab-speed-dial-action.red {
                    --paper-fab-speed-dial-action-background: var(--paper-red-500);
                    --paper-fab-speed-dial-action-keyboard-focus-background: var(--paper-red-900);
                }
                paper-fab-speed-dial-action.amber {
                    --paper-fab-speed-dial-action-background: var(--paper-amber-500);
                    --paper-fab-speed-dial-action-keyboard-focus-background: var(--paper-amber-900);
                }
                paper-fab-speed-dial-action.indigo {
                    --paper-fab-speed-dial-action-background: var(--paper-indigo-500);
                    --paper-fab-speed-dial-action-keyboard-focus-background: var(--paper-indigo-900);
                }
                paper-fab-speed-dial-action.teal {
                    --paper-fab-speed-dial-action-background: var(--paper-teal-500);
                    --paper-fab-speed-dial-action-keyboard-focus-background: var(--paper-teal-900);
                }
                paper-fab-speed-dial-action.blue {
                    --paper-fab-speed-dial-action-background: var(--paper-blue-500);
                    --paper-fab-speed-dial-action-keyboard-focus-background: var(--paper-blue-900);
                }
                .tab-container {
                    @apply --layout-horizontal;
                    @apply --layout-wrap;
                }
                .tab {
                    margin: 8px;
                }
                @media screen and (min-width: 993px) {
                    .tab {
                        width: calc(50% - 16px);
                    }
                    paper-dialog {
                        width: 33%;
                    }
                    .container {
                        width: 67%;
                        margin: auto;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    .tab {
                        width: calc(100% - 16px);
                    }
                    paper-dialog {
                        width: 75%;
                    }
                    .container {
                        width: 80%;
                        margin: auto;
                    }
                }
                @media screen and (max-width: 600px) {
                    .tab {
                        width: calc(100% - 16px);
                    }
                    paper-dialog {
                        width: 100%;
                    }
                }
            </style>

            <app-route id="appRoute" route="{{route}}" pattern="/:recipeId" data="{{routeData}}"></app-route>

            <div class="container">
                <div hidden\$="[[editing]]">
                    <recipe-display id="recipeDisplay" recipe-id="[[recipeId]]"></recipe-display>
                    <div class="tab-container">
                        <div id="images" class="tab">
                            <image-list id="imageList" recipe-id="[[recipeId]]" on-image-added="_refreshMainImage" on-image-deleted="_refreshMainImage" on-main-image-changed="_refreshMainImage"></image-list>
                        </div>
                        <div id="notes" class="tab">
                            <note-list id="noteList" recipe-id="[[recipeId]]"></note-list>
                        </div>
                    </div>
                </div>
                <div hidden\$="[[!editing]]">
                    <h4>Edit Recipe</h4>
                    <recipe-edit id="recipeEdit" recipe-id="[[recipeId]]" on-recipe-edit-cancel="_editCanceled" on-recipe-edit-save="_editSaved"></recipe-edit>
                </div>
            </div>
            <paper-fab-speed-dial id="actions" icon="icons:more-vert" hidden\$="[[editing]]" with-backdrop="">
                <a href="/create"><paper-fab-speed-dial-action class="green" icon="icons:add" on-tap="_newButtonTapped">New</paper-fab-speed-dial-action></a>
                <paper-fab-speed-dial-action class="red" icon="icons:delete" on-tap="_deleteButtonTapped">Delete</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="amber" icon="icons:create" on-tap="_editButtonTapped">Edit</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="indigo" icon="icons:link" on-tap="_addLinkButtonTapped">Link to Another Recipe</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="teal" icon="image:add-a-photo" on-tap="_addImageButtonTapped">Upload Picture</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="blue" icon="editor:insert-comment" on-tap="_addNoteButtonTapped">Add Note</paper-fab-speed-dial-action>
            </paper-fab-speed-dial>

            <confirmation-dialog id="confirmDeleteDialog" icon="delete" title="Delete Recipe?" message="Are you sure you want to delete this recipe?" on-confirmed="_deleteRecipe"></confirmation-dialog>

            <recipe-link-dialog id="recipeLinkDialog" recipe-id="[[recipeId]]" on-link-added="_onLinkAdded"></recipe-link-dialog>

            <iron-ajax bubbles="" id="deleteAjax" url="/api/v1/recipes/[[recipeId]]" method="DELETE" on-response="_handleDeleteRecipeResponse"></iron-ajax>
`;
    }

    static get is() { return 'recipes-view'; }
    static get properties() {
        return {
            route: {
                type: Object,
                notify: true,
            },
            recipeId: {
                type: String,
            },
            editing: {
                type: Boolean,
                notify: true,
                value: false,
            },
        };
    }
    static get observers() {
        return [
            '_recipeIdChanged(routeData.recipeId)',
        ];
    }

    refresh() {
        this.$.recipeDisplay.refresh();
        this.$.imageList.refresh();
        this.$.noteList.refresh();
    }

    _isActiveChanged(active) {
        // Always exit edit mode when we change screens
        this.editing = false;

        if (active) {
            this.refresh();
        }
    }
    _recipeIdChanged(recipeId) {
        this.recipeId = recipeId;
    }
    _newButtonTapped(e) {
        this.$.actions.close();
    }
    _deleteButtonTapped(e) {
        e.preventDefault();

        this.$.confirmDeleteDialog.open();
        this.$.actions.close();
    }
    _deleteRecipe(e) {
        this.$.deleteAjax.generateRequest();
    }
    _editButtonTapped(e) {
        e.preventDefault();

        this.$.actions.close();
        this.$.recipeEdit.refresh();
        this.editing = true;
    }
    _editCanceled(e) {
        this.editing = false;
        this.refresh();
    }
    _editSaved(e) {
        this.editing = false;
        this.refresh();
    }
    _addLinkButtonTapped(e) {
        this.$.recipeLinkDialog.open();
        this.$.actions.close();
    }
    _addImageButtonTapped(e) {
        e.preventDefault();

        this.$.actions.close();
        this.$.imageList.add();
    }
    _addNoteButtonTapped(e) {
        e.preventDefault();

        this.$.actions.close();
        this.$.noteList.add();
    }
    _refreshMainImage(e) {
        this.$.recipeDisplay.refresh({mainImage: true});
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    _onLinkAdded(e) {
        this.$.recipeDisplay.refresh({links: true});
    }
    _handleDeleteRecipeResponse(e) {
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
        this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/search'}}));
    }
}

window.customElements.define(RecipesView.is, RecipesView);
