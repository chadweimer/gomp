'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { PaperMenuButton } from '@polymer/paper-menu-button/paper-menu-button.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import { RecipeImage } from '../models/models.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/image-icons.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-spinner/paper-spinner.js';
import './confirmation-dialog.js';
import '../common/shared-styles.js';

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
                <p>Browse for a picture to upload to this recipe.</p>
                <form id="addForm" enctype="multipart/form-data">
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

    public async refresh() {
        if (!this.recipeId) {
            return;
        }

        this.images = [];
        try {
            this.images = await this.AjaxGetWithResult(`/api/v1/recipes/${this.recipeId}/images`);
        } catch (e) {
            console.error(e);
        }
    }

    public add() {
        this.addDialog.open();
    }

    protected async addDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.detail.canceled || !e.detail.confirmed) {
            return;
        }

        try {
            this.uploadingDialog.open();
            await this.AjaxPost(`/api/v1/recipes/${this.recipeId}`, new FormData(this.addForm));
            this.uploadingDialog.close();
            this.dispatchEvent(new CustomEvent('image-added'));
            this.showToast('Upload complete.');
            await this.refresh();
        } catch (e) {
            this.uploadingDialog.close();
            this.showToast('Upload failed!');
            console.error(e);
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
    protected async setMainImage(e: Event) {
        const el = e.target as HTMLElement;

        const imageId = parseInt(el.dataset.id, 10) as any;
        try {
            await this.AjaxPut(`/api/v1/recipes/${this.recipeId}/image`, imageId);
            this.dispatchEvent(new CustomEvent('main-image-changed'));
            this.showToast('Main picture changed.');
        } catch (e) {
            this.showToast('Changing main picture failed!');
            console.error(e);
        }
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
    protected async deleteImage(e: Event) {
        const el = e.target as HTMLElement;

        try {
            await this.AjaxDelete(`/api/v1/images/${el.dataset.id}`);
            this.dispatchEvent(new CustomEvent('image-deleted'));
            this.showToast('Picture deleted.');
            await this.refresh();
        } catch (e) {
            this.showToast('Deleting picture failed!');
            console.error(e);
        }
    }
}
