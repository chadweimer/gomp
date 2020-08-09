'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { RecipeDisplay } from './components/recipe-display.js';
import { ImageList } from './components/image-list.js';
import { NoteList } from './components/note-list.js';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { RecipeEdit } from './components/recipe-edit.js';
import { RecipeLinkDialog } from './components/recipe-link-dialog.js';
import { User, Recipe } from './models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/editor-icons.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial-action.js';
import './components/recipe-display.js';
import './components/image-list.js';
import './components/note-list.js';
import './components/confirmation-dialog.js';
import './components/recipe-edit.js';
import './components/recipe-link-dialog.js';
import './shared-styles.js';

@customElement('recipes-view')
export class RecipesView extends GompBaseElement {
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
                #confirmArchiveDialog {
                    --confirmation-dialog-title-color: var(--paper-purple-500);
                }
                #confirmUnarchiveDialog {
                    --confirmation-dialog-title-color: var(--paper-purple-500);
                }
                #confirmDeleteDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
                #actions {
                    --paper-fab-speed-dial-position: fixed;
                }
                paper-fab-speed-dial-action[hidden] {
                    display: none !important;
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
                paper-fab-speed-dial-action.purple {
                    --paper-fab-speed-dial-action-background: var(--paper-purple-500);
                    --paper-fab-speed-dial-action-keyboard-focus-background: var(--paper-purple-900);
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

            <app-route id="appRoute" route="{{route}}" pattern="/:recipeId/:mode" data="{{routeData}}"></app-route>

            <div class="container">
                <div hidden\$="[[areEqual(mode, 'edit')]]">
                    <recipe-display id="recipeDisplay" recipe-id="[[recipeId]]" readonly\$="[[!getCanEdit(currentUser)]]"></recipe-display>
                    <div class="tab-container">
                        <div id="images" class="tab">
                            <image-list id="imageList" recipe-id="[[recipeId]]" on-image-added="refreshMainImage" on-image-deleted="refreshMainImage" on-main-image-changed="refreshMainImage" readonly\$="[[!getCanEdit(currentUser)]]"></image-list>
                        </div>
                        <div id="notes" class="tab">
                            <note-list id="noteList" recipe-id="[[recipeId]]" readonly\$="[[!getCanEdit(currentUser)]]"></note-list>
                        </div>
                    </div>
                </div>
                <div hidden\$="[[!areEqual(mode, 'edit')]]">
                    <h4>Edit Recipe</h4>
                    <recipe-edit id="recipeEdit" recipe-id="[[recipeId]]" on-recipe-edit-cancel="editCanceled" on-recipe-edit-save="editSaved"></recipe-edit>
                </div>
            </div>
            <div hidden\$="[[!getCanEdit(currentUser)]]">
                <paper-fab-speed-dial id="actions" icon="icons:more-vert" hidden\$="[[areEqual(mode, 'edit')]]" with-backdrop="">
                    <a href="/create"><paper-fab-speed-dial-action class="green" icon="icons:add" on-click="onNewButtonClicked">New</paper-fab-speed-dial-action></a>
                    <paper-fab-speed-dial-action class="red" icon="icons:delete" on-click="onDeleteButtonClicked">Delete</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="purple" icon="icons:archive" on-click="onArchiveButtonClicked" hidden="[[!areEqual(recipeState, 'active')]]">Archive</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="purple" icon="icons:unarchive" on-click="onUnarchiveButtonClicked" hidden="[[!areEqual(recipeState, 'archived')]]">Unarchive</paper-fab-speed-dial-action>
                    <a href="/recipes/[[recipeId]]/edit"><paper-fab-speed-dial-action class="amber" icon="icons:create" on-click="onEditButtonClicked">Edit</paper-fab-speed-dial-action></a>
                    <paper-fab-speed-dial-action class="indigo" icon="icons:link" on-click="onAddLinkButtonClicked">Link to Another Recipe</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="teal" icon="image:add-a-photo" on-click="onAddImageButtonClicked">Upload Picture</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="blue" icon="editor:insert-comment" on-click="onAddNoteButtonClicked">Add Note</paper-fab-speed-dial-action>
                </paper-fab-speed-dial>
            </div>

            <confirmation-dialog id="confirmArchiveDialog" icon="icons:archive" title="Archive Recipe?" message="Are you sure you want to archive this recipe?" on-confirmed="archiveRecipe"></confirmation-dialog>
            <confirmation-dialog id="confirmUnarchiveDialog" icon="icons:unarchive" title="Unarchive Recipe?" message="Are you sure you want to unarchive this recipe?" on-confirmed="unarchiveRecipe"></confirmation-dialog>
            <confirmation-dialog id="confirmDeleteDialog" icon="delete" title="Delete Recipe?" message="Are you sure you want to delete this recipe?" on-confirmed="deleteRecipe"></confirmation-dialog>

            <recipe-link-dialog id="recipeLinkDialog" recipe-id="[[recipeId]]" on-link-added="onLinkAdded"></recipe-link-dialog>

            <iron-ajax bubbles="" id="updateStateAjax" url="/api/v1/recipes/[[recipeId]]/state" method="PUT" on-response="handleUpdateStateResponse"></iron-ajax>
            <iron-ajax bubbles="" id="deleteAjax" url="/api/v1/recipes/[[recipeId]]" method="DELETE" on-response="handleDeleteRecipeResponse"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    public route: object = {};
    @property({type: String, notify: true})
    public recipeId = '';
    @property({type: String, notify: true})
    protected mode = '';
    @property({type: Object, notify: true})
    public currentUser: User = null;

    protected recipeState: string = null;

    private get recipeDisplay(): RecipeDisplay {
        return this.$.recipeDisplay as RecipeDisplay;
    }
    private get imageList(): ImageList {
        return this.$.imageList as ImageList;
    }
    private get noteList(): NoteList {
        return this.$.noteList as NoteList;
    }
    private get recipeEdit(): RecipeEdit {
        return this.$.recipeEdit as RecipeEdit;
    }
    private get confirmArchiveDialog(): ConfirmationDialog {
        return this.$.confirmArchiveDialog as ConfirmationDialog;
    }
    private get confirmUnarchiveDialog(): ConfirmationDialog {
        return this.$.confirmUnarchiveDialog as ConfirmationDialog;
    }
    private get confirmDeleteDialog(): ConfirmationDialog {
        return this.$.confirmDeleteDialog as ConfirmationDialog;
    }
    private get recipeLinkDialog(): RecipeLinkDialog {
        return this.$.recipeLinkDialog as RecipeLinkDialog;
    }
    private get actions(): any {
        return this.$.actions as any;
    }
    private get updateStateAjax(): IronAjaxElement {
        return this.$.updateStateAjax as IronAjaxElement;
    }
    private get deleteAjax(): IronAjaxElement {
        return this.$.deleteAjax as IronAjaxElement;
    }

    static get observers() {
        return [
            'recipeIdChanged(routeData.recipeId)',
        ];
    }

    public ready() {
        this.addEventListener('recipe-loaded', (e: CustomEvent) => this.onRecipeLoaded(e));

        super.ready();
    }

    public refresh() {
        this.recipeDisplay.refresh(null);
        this.imageList.refresh();
        this.noteList.refresh();
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive) {
            this.refresh();
        }
    }
    protected recipeIdChanged(recipeId: string) {
        this.recipeId = recipeId;
    }
    protected onNewButtonClicked() {
        this.actions.close();
    }
    protected onArchiveButtonClicked() {
        this.confirmArchiveDialog.open();
        this.actions.close();
    }
    protected archiveRecipe() {
        this.updateStateAjax.body = JSON.stringify('archived') as any;
        this.updateStateAjax.generateRequest();
    }
    protected onUnarchiveButtonClicked() {
        this.confirmUnarchiveDialog.open();
        this.actions.close();
    }
    protected unarchiveRecipe() {
        this.updateStateAjax.body = JSON.stringify('active') as any;
        this.updateStateAjax.generateRequest();
    }
    protected onDeleteButtonClicked() {
        this.confirmDeleteDialog.open();
        this.actions.close();
    }
    protected deleteRecipe() {
        this.deleteAjax.generateRequest();
    }
    protected onEditButtonClicked() {
        this.actions.close();
        this.recipeEdit.refresh();
    }
    protected editCanceled() {
        this.mode = 'view';
        this.refresh();
    }
    protected editSaved() {
        this.mode = 'view';
        this.refresh();
    }
    protected onAddLinkButtonClicked() {
        this.recipeLinkDialog.open();
        this.actions.close();
    }
    protected onAddImageButtonClicked() {
        this.actions.close();
        this.imageList.add();
    }
    protected onAddNoteButtonClicked() {
        this.actions.close();
        this.noteList.add();
    }
    protected refreshMainImage() {
        this.recipeDisplay.refresh({mainImage: true});
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    protected onLinkAdded() {
        this.recipeDisplay.refresh({links: true});
    }
    protected handleUpdateStateResponse() {
        this.recipeDisplay.refresh({recipe: true});
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    protected handleDeleteRecipeResponse() {
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
        this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/search'}}));
    }

    private onRecipeLoaded(e: CustomEvent<{recipe: Recipe}>) {
        this.recipeState = e.detail.recipe?.state;
    }
}
