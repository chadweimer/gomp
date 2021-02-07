'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { PaperMenuButton } from '@polymer/paper-menu-button/paper-menu-button.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import { RecipeImage } from '../models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-spinner/paper-spinner.js';
import './confirmation-dialog.js';
import '../shared-styles.js';

@customElement('image-list')
export class ImageList extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                    @apply --layout-horizontal;
                    @apply --layout-wrap;
                }
                header {
                    font-size: 1.5em;
                }
                paper-divider {
                    width: 100%;
                }
                #addDialog h3 > span {
                    padding-left: 0.25em;
                }
                #confirmMainImageDialog {
                    --confirmation-dialog-title-color: var(--paper-blue-500);
                }
                #confirmDeleteDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
                .imageContainer {
                    margin: 2px;
                }
                .menu {
                    position: relative;
                    color: white;
                    right: 45px;
                    bottom: 5px;
                    margin-right: -45px;
                }
                img {
                    width: 150px;
                    height: 150px;
                }
            </style>

            <header>Pictures</header>
            <paper-divider></paper-divider>
            <template is="dom-repeat" items="[[images]]">
                <div class="imageContainer">
                    <a target="_blank" href\$="[[item.url]]"><img src="[[item.thumbnailUrl]]" alt="[[item.name]]"></a>
                </div>
                <div hidden\$="[[readonly]]">
                    <paper-menu-button id="imageMenu" class="menu" horizontal-align="right" data-id\$="[[item.id]]">
                        <paper-icon-button icon="icons:more-vert" slot="dropdown-trigger"></paper-icon-button>
                        <paper-listbox slot="dropdown-content">
                            <a href="#!" tabindex="-1" on-click="onSetMainImageClicked">
                                <paper-icon-item tabindex="-1"><iron-icon class="blue" icon="image:photo-library" slot="item-icon"></iron-icon> Set as main picture</paper-icon-item>
                            </a>
                            <a href="#!" tabindex="-1" on-click="onDeleteClicked">
                                <paper-icon-item tabindex="-1"><iron-icon class="red" icon="icons:delete" slot="item-icon"></iron-icon> Delete</paper-icon-item>
                            </a>
                        </paper-listbox>
                    </paper-menu-button>
                </div>
            </template>

            <paper-dialog id="addDialog" on-iron-overlay-closed="addDialogClosed" with-backdrop>
                <h3 class="teal"><iron-icon icon="image:add-a-photo"></iron-icon> <span>Upload Picture</span></h3>
                <p>Browse for a picture to upload to this recipe.</p><p>
                </p><form id="addForm" enctype="multipart/form-data">
                    <paper-input-container always-float-label>
                        <label slot="label">Picture</label>
                        <iron-input slot="input">
                            <input name="file_content" type="file" accept=".jpg,.jpeg,.png" required>
                        </iron-input>
                    </paper-input-container>
                </form>
                <div class="buttons">
                    <paper-button dialog-dismiss>Cancel</paper-button>
                    <paper-button dialog-confirm>Upload</paper-button>
                </div>
            </paper-dialog>
            <paper-dialog id="uploadingDialog" with-backdrop>
                <h3><paper-spinner active></paper-spinner>Uploading</h3>
            </paper-dialog>

            <confirmation-dialog id="confirmMainImageDialog" title="Change Main Picture?" message="Are you sure you want to make this the main picture for the recipe?" on-confirmed="setMainImage"></confirmation-dialog>
            <confirmation-dialog id="confirmDeleteDialog" icon="delete" title="Delete Picture?" message="Are you sure you want to delete this picture?" on-confirmed="deleteImage"></confirmation-dialog>

            <iron-ajax bubbles auto id="getAjax" url="/api/v1/recipes/[[recipeId]]/images" on-request="handleGetImagesRequest" on-response="handleGetImagesResponse"></iron-ajax>
            <iron-ajax bubbles id="addAjax" url="/api/v1/recipes/[[recipeId]]/images" method="POST" on-request="handleAddRequest" on-response="handleAddResponse" on-error="handleAddError"></iron-ajax>
            <iron-ajax bubbles id="setMainImageAjax" url="/api/v1/recipes/[[recipeId]]/image" method="PUT" on-response="handleSetMainImageResponse" on-error="handleSetMainImageError"></iron-ajax>
            <iron-ajax bubbles id="deleteAjax" method="DELETE" on-response="handleDeleteResponse" on-error="handleDeleteError"></iron-ajax>
`;
    }

    @property({type: String})
    public recipeId = '';

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected images: RecipeImage[] = [];

    private get addForm(): HTMLFormElement {
        return this.$.addForm as HTMLFormElement;
    }
    private get uploadingDialog(): PaperDialogElement {
        return this.$.uploadingDialog as PaperDialogElement;
    }
    private get addDialog(): PaperDialogElement {
        return this.$.addDialog as PaperDialogElement;
    }
    private get confirmMainImageDialog(): ConfirmationDialog {
        return this.$.confirmMainImageDialog as ConfirmationDialog;
    }
    private get confirmDeleteDialog(): ConfirmationDialog {
        return this.$.confirmDeleteDialog as ConfirmationDialog;
    }
    private get getAjax(): IronAjaxElement {
        return this.$.getAjax as IronAjaxElement;
    }
    private get addAjax(): IronAjaxElement {
        return this.$.addAjax as IronAjaxElement;
    }
    private get deleteAjax(): IronAjaxElement {
        return this.$.deleteAjax as IronAjaxElement;
    }
    private get setMainImageAjax(): IronAjaxElement {
        return this.$.setMainImageAjax as IronAjaxElement;
    }

    public refresh() {
        if (!this.recipeId) {
            return;
        }

        this.getAjax.generateRequest();
    }

    public add() {
        this.addDialog.open();
    }

    protected addDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (!e.detail.canceled && e.detail.confirmed) {
            this.addAjax.body = new FormData(this.addForm);
            this.addAjax.generateRequest();
        }
    }
    protected onSetMainImageClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        const el = e.target as HTMLElement;
        const menu = el.closest('#imageMenu') as PaperMenuButton;
        menu.close();

        this.confirmMainImageDialog.dataset.id = menu.dataset.id;
        this.confirmMainImageDialog.open();
    }
    protected setMainImage(e: Event) {
        const el = e.target as HTMLElement;

        this.setMainImageAjax.body = parseInt(el.dataset.id, 10) as any;
        this.setMainImageAjax.generateRequest();
    }
    protected onDeleteClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        const el = e.target as HTMLElement;
        const menu = el.closest('#imageMenu') as PaperMenuButton;
        menu.close();

        this.confirmDeleteDialog.dataset.id = menu.dataset.id;
        this.confirmDeleteDialog.open();
    }
    protected deleteImage(e: Event) {
        const el = e.target as HTMLElement;

        this.deleteAjax.url = '/api/v1/images/' + el.dataset.id;
        this.deleteAjax.generateRequest();
    }

    protected handleGetImagesRequest() {
        this.images = [];
    }
    protected handleGetImagesResponse(e: CustomEvent<{response: RecipeImage[]}>) {
        this.images = e.detail.response;
    }
    protected handleAddRequest() {
        this.uploadingDialog.open();
    }
    protected handleAddResponse() {
        this.uploadingDialog.close();
        this.refresh();
        this.dispatchEvent(new CustomEvent('image-added'));
        this.showToast('Upload complete.');
    }
    protected handleAddError() {
        this.uploadingDialog.close();
        this.showToast('Upload failed!');
    }
    protected handleSetMainImageResponse() {
        this.dispatchEvent(new CustomEvent('main-image-changed'));
        this.showToast('Main picture changed.');
    }
    protected handleSetMainImageError() {
        this.showToast('Changing main picture failed!');
    }
    protected handleDeleteResponse() {
        this.refresh();
        this.dispatchEvent(new CustomEvent('image-deleted'));
        this.showToast('Picture deleted.');
    }
    protected handleDeleteError() {
        this.showToast('Deleting picture failed!');
    }
}
