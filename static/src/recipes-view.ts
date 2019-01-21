import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompCoreMixin } from './mixins/gomp-core-mixin.js';
import { RecipeDisplay } from './components/recipe-display.js';
import { ImageList } from './components/image-list.js';
import { NoteList } from './components/note-list.js';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { RecipeEdit } from './components/recipe-edit.js';
import { RecipeLinkDialog } from './components/recipe-link-dialog.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/editor-icons.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial-action.js';
import './shared-styles.js';

@customElement('recipes-view')
export class RecipesView extends GompCoreMixin(PolymerElement) {
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
                <a href="/create"><paper-fab-speed-dial-action class="green" icon="icons:add" on-click="_onNewButtonClicked">New</paper-fab-speed-dial-action></a>
                <paper-fab-speed-dial-action class="red" icon="icons:delete" on-click="_onDeleteButtonClicked">Delete</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="amber" icon="icons:create" on-click="_onEditButtonClicked">Edit</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="indigo" icon="icons:link" on-click="_onAddLinkButtonClicked">Link to Another Recipe</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="teal" icon="image:add-a-photo" on-click="_onAddImageButtonClicked">Upload Picture</paper-fab-speed-dial-action>
                <paper-fab-speed-dial-action class="blue" icon="editor:insert-comment" on-click="_onAddNoteButtonClicked">Add Note</paper-fab-speed-dial-action>
            </paper-fab-speed-dial>

            <confirmation-dialog id="confirmDeleteDialog" icon="delete" title="Delete Recipe?" message="Are you sure you want to delete this recipe?" on-confirmed="_deleteRecipe"></confirmation-dialog>

            <recipe-link-dialog id="recipeLinkDialog" recipe-id="[[recipeId]]" on-link-added="_onLinkAdded"></recipe-link-dialog>

            <iron-ajax bubbles="" id="deleteAjax" url="/api/v1/recipes/[[recipeId]]" method="DELETE" on-response="_handleDeleteRecipeResponse"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    route: object = {};
    @property({type: String, notify: true})
    recipeId = '';
    @property({type: Boolean, notify: true})
    editing = false;

    static get observers() {
        return [
            '_recipeIdChanged(routeData.recipeId)',
        ];
    }

    refresh() {
        (<RecipeDisplay>this.$.recipeDisplay).refresh(null);
        (<ImageList>this.$.imageList).refresh();
        (<NoteList>this.$.noteList).refresh();
    }

    _isActiveChanged(isActive: boolean) {
        // Always exit edit mode when we change screens
        this.editing = false;

        if (isActive) {
            this.refresh();
        }
    }
    _recipeIdChanged(recipeId: string) {
        this.recipeId = recipeId;
    }
    _onNewButtonClicked() {
        (<any>this.$.actions).close();
    }
    _onDeleteButtonClicked() {
        (<ConfirmationDialog>this.$.confirmDeleteDialog).open();
        (<any>this.$.actions).close();
    }
    _deleteRecipe() {
        (<IronAjaxElement>this.$.deleteAjax).generateRequest();
    }
    _onEditButtonClicked() {
        (<any>this.$.actions).close();
        (<RecipeEdit>this.$.recipeEdit).refresh();
        this.editing = true;
    }
    _editCanceled() {
        this.editing = false;
        this.refresh();
    }
    _editSaved() {
        this.editing = false;
        this.refresh();
    }
    _onAddLinkButtonClicked() {
        (<RecipeLinkDialog>this.$.recipeLinkDialog).open();
        (<any>this.$.actions).close();
    }
    _onAddImageButtonClicked() {
        (<any>this.$.actions).close();
        (<ImageList>this.$.imageList).add();
    }
    _onAddNoteButtonClicked() {
        (<any>this.$.actions).close();
        (<NoteList>this.$.noteList).add();
    }
    _refreshMainImage() {
        (<RecipeDisplay>this.$.recipeDisplay).refresh({mainImage: true});
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    _onLinkAdded() {
        (<RecipeDisplay>this.$.recipeDisplay).refresh({links: true});
    }
    _handleDeleteRecipeResponse() {
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
        this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/search'}}));
    }
}
