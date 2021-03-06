import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from './common/gomp-base-element.js';
import { RecipeDisplay } from './components/recipe-display.js';
import { ImageList } from './components/image-list.js';
import { NoteList } from './components/note-list.js';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { RecipeEdit } from './components/recipe-edit.js';
import { RecipeLinkDialog } from './components/recipe-link-dialog.js';
import { User, Recipe, RecipeState } from './models/models.js';
import '@material/mwc-tab';
import '@material/mwc-tab-bar';
import '@polymer/app-route/app-route.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/editor-icons.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial.js';
import '@cwmr/paper-fab-speed-dial/paper-fab-speed-dial-action.js';
import './common/shared-styles.js';
import './components/recipe-display.js';
import './components/image-list.js';
import './components/note-list.js';
import './components/confirmation-dialog.js';
import './components/recipe-edit.js';
import './components/recipe-link-dialog.js';

@customElement('recipes-view')
export class RecipesView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                .disabled {
                    pointer-events: none;
                    user-select: none;
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
                .tab {
                    margin: 8px;
                }
                @media screen and (min-width: 992px) {
                    .tab {
                        width: calc(50% - 16px);
                    }
                }
                @media screen and (min-width: 600px) and (max-width: 991px) {
                    .tab {
                        width: calc(100% - 16px);
                    }
                }
                @media screen and (max-width: 599px) {
                    .tab {
                        width: calc(100% - 16px);
                    }
                }
            </style>

            <app-route id="appRoute" route="{{route}}" pattern="/:recipeId/:mode" data="{{routeData}}"></app-route>

            <div class="container-wide padded-10">
                <div hidden\$="[[areEqual(mode, 'edit')]]">
                    <recipe-display id="recipeDisplay" recipe-id="[[recipeId]]" readonly\$="[[!getCanEdit(currentUser)]]"></recipe-display>
                    <div class="wrap-horizontal">
                        <div class="tab">
                            <mwc-tab-bar activeIndex="0">
                                <mwc-tab label="Pictures" class="disabled"></mwc-tab>
                            </mwc-tab-bar>
                            <image-list id="imageList" recipe-id="[[recipeId]]" on-image-added="refreshMainImage" on-image-deleted="refreshMainImage" on-main-image-changed="refreshMainImage" readonly\$="[[!getCanEdit(currentUser)]]"></image-list>
                        </div>
                        <div class="tab">
                            <mwc-tab-bar activeIndex="0">
                                <mwc-tab label="Notes" class="disabled"></mwc-tab>
                            </mwc-tab-bar>
                            <note-list id="noteList" recipe-id="[[recipeId]]" readonly\$="[[!getCanEdit(currentUser)]]"></note-list>
                        </div>
                    </div>
                </div>
                <div hidden\$="[[!areEqual(mode, 'edit')]]">
                    <h4>Edit Recipe</h4>
                    <recipe-edit id="recipeEdit" recipe-id="[[recipeId]]" on-recipe-edit-cancel="editComplete" on-recipe-edit-save="editComplete"></recipe-edit>
                </div>
            </div>
            <div hidden\$="[[!getCanEdit(currentUser)]]">
                <paper-fab-speed-dial id="actions" icon="icons:more-vert" hidden\$="[[areEqual(mode, 'edit')]]" with-backdrop>
                    <paper-fab-speed-dial-action class="green" icon="icons:add" on-click="onNewButtonClicked">New</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="red" icon="icons:delete" on-click="onDeleteButtonClicked">Delete</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="purple" icon="icons:archive" on-click="onArchiveButtonClicked" hidden="[[!areEqual(recipeState, 'active')]]">Archive</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="purple" icon="icons:unarchive" on-click="onUnarchiveButtonClicked" hidden="[[!areEqual(recipeState, 'archived')]]">Unarchive</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="amber" icon="icons:create" on-click="onEditButtonClicked">Edit</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="indigo" icon="icons:link" on-click="onAddLinkButtonClicked">Link to Another Recipe</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="teal" icon="image:add-a-photo" on-click="onAddImageButtonClicked">Upload Picture</paper-fab-speed-dial-action>
                    <paper-fab-speed-dial-action class="blue" icon="editor:insert-comment" on-click="onAddNoteButtonClicked">Add Note</paper-fab-speed-dial-action>
                </paper-fab-speed-dial>
            </div>

            <confirmation-dialog id="confirmArchiveDialog" title="Archive Recipe?" message="Are you sure you want to archive this recipe?" on-confirmed="archiveRecipe"></confirmation-dialog>
            <confirmation-dialog id="confirmUnarchiveDialog" title="Unarchive Recipe?" message="Are you sure you want to unarchive this recipe?" on-confirmed="unarchiveRecipe"></confirmation-dialog>
            <confirmation-dialog id="confirmDeleteDialog" title="Delete Recipe?" message="Are you sure you want to delete this recipe?" on-confirmed="deleteRecipe"></confirmation-dialog>

            <recipe-link-dialog id="recipeLinkDialog" recipe-id="[[recipeId]]" on-link-added="onLinkAdded"></recipe-link-dialog>
`;
    }

    @property({type: Object, notify: true})
    public route: object = {};
    @property({type: String, notify: true})
    public recipeId = '';
    @property({type: String, notify: true})
    protected mode = '';
    @property({type: Object, notify: true})
    public currentUser: User|null = null;

    protected recipeState: string|null = null;

    private get recipeDisplay() {
        return this.$.recipeDisplay as RecipeDisplay;
    }
    private get imageList() {
        return this.$.imageList as ImageList;
    }
    private get noteList() {
        return this.$.noteList as NoteList;
    }
    private get recipeEdit() {
        return this.$.recipeEdit as RecipeEdit;
    }
    private get confirmArchiveDialog() {
        return this.$.confirmArchiveDialog as ConfirmationDialog;
    }
    private get confirmUnarchiveDialog() {
        return this.$.confirmUnarchiveDialog as ConfirmationDialog;
    }
    private get confirmDeleteDialog() {
        return this.$.confirmDeleteDialog as ConfirmationDialog;
    }
    private get recipeLinkDialog() {
        return this.$.recipeLinkDialog as RecipeLinkDialog;
    }
    private get actions(): any {
        return this.$.actions as any;
    }

    static get observers() {
        return [
            'recipeIdChanged(routeData.recipeId)',
            'modeChanged(routeData.mode)',
        ];
    }

    public ready() {
        this.addEventListener('recipe-loaded', e => this.onRecipeLoaded(e as CustomEvent));

        super.ready();
    }

    public async refresh() {
        if (this.mode === 'edit') {
            await this.recipeEdit.refresh();
        } else {
            await this.recipeDisplay.refresh();
            await this.imageList.refresh();
            await this.noteList.refresh();
        }
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive) {
            this.refresh();
        }
    }
    protected recipeIdChanged(recipeId: string) {
        this.recipeId = recipeId;
    }
    protected async modeChanged(mode: string) {
        this.mode = mode;

        if (this.isActive) {
            await this.refresh();
        }
    }
    protected onNewButtonClicked() {
        this.actions.close();
        this.navigateTo('/create');
    }
    protected onArchiveButtonClicked() {
        this.confirmArchiveDialog.show();
        this.actions.close();
    }
    protected async archiveRecipe() {
        await this.setRecipeState(RecipeState.Archived);
    }
    protected onUnarchiveButtonClicked() {
        this.confirmUnarchiveDialog.show();
        this.actions.close();
    }
    protected async unarchiveRecipe() {
        await this.setRecipeState(RecipeState.Active);
    }
    protected onDeleteButtonClicked() {
        this.confirmDeleteDialog.show();
        this.actions.close();
    }
    protected async deleteRecipe() {
        try {
            await this.AjaxDelete(`/api/v1/recipes/${this.recipeId}`);
            this.showToast('Recipe deleted.');
            this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
            this.navigateTo('/search');
        } catch (e) {
            this.showToast('Deleting recipe failed!');
            console.error(e);
        }
    }
    protected onEditButtonClicked() {
        this.actions.close();
        this.navigateTo(`/recipes/${this.recipeId}/edit`);
    }
    protected editComplete() {
        this.navigateTo(`/recipes/${this.recipeId}/view`);
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
    protected async refreshMainImage() {
        await this.recipeDisplay.refresh({mainImage: true});
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    protected async onLinkAdded() {
        await this.recipeDisplay.refresh({links: true});
    }

    private async setRecipeState(state: RecipeState) {
        try {
            await this.AjaxPut(`/api/v1/recipes/${this.recipeId}/state`, state);
            this.showToast('Recipe state changed.');
            this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
            await this.recipeDisplay.refresh({recipe: true});
        } catch (e) {
            this.showToast('Changing recipe state failed!');
            console.error(e);
        }
    }
    private onRecipeLoaded(e: CustomEvent<{recipe: Recipe}>) {
        this.recipeState = e.detail.recipe?.state;
    }
}
