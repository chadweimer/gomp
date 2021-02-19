'use strict';
import { Dialog } from '@material/mwc-dialog';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperMenuButton } from '@polymer/paper-menu-button/paper-menu-button.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import { RecipeImage } from '../models/models.js';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-input/iron-input.js';
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
                        <mwc-icon-button icon="more_vert" slot="dropdown-trigger"></mwc-icon-button>
                        <paper-listbox slot="dropdown-content">
                            <a href="#!" tabindex="-1" on-click="onSetMainImageClicked">
                                <paper-icon-item tabindex="-1"><mwc-icon class="blue" slot="item-icon">photo_library</mwc-icon> Set as main picture</paper-icon-item>
                            </a>
                            <a href="#!" tabindex="-1" on-click="onDeleteClicked">
                                <paper-icon-item tabindex="-1"><mwc-icon class="red" slot="item-icon">delete</mwc-icon> Delete</paper-icon-item>
                            </a>
                        </paper-listbox>
                    </paper-menu-button>
                </div>
            </template>

            <mwc-dialog id="addDialog" heading="Upload Picture" on-closed="addDialogClosed">
                <div>
                    <p>Browse for a picture to upload to this recipe.</p>
                    <form id="addForm" enctype="multipart/form-data">
                        <paper-input-container always-float-label>
                            <label slot="label">Picture</label>
                            <iron-input slot="input">
                                <input name="file_content" type="file" accept=".jpg,.jpeg,.png" required>
                            </iron-input>
                        </paper-input-container>
                    </form>
                </div>
                <mwc-button slot="primaryAction" label="Upload" dialogAction="upload"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>
            <mwc-dialog id="uploadingDialog">
                <paper-spinner active></paper-spinner>Uploading
            </mwc-dialog>

            <confirmation-dialog id="confirmMainImageDialog" title="Change Main Picture?" message="Are you sure you want to make this the main picture for the recipe?" on-confirmed="setMainImage"></confirmation-dialog>
            <confirmation-dialog id="confirmDeleteDialog" title="Delete Picture?" message="Are you sure you want to delete this picture?" on-confirmed="deleteImage"></confirmation-dialog>
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
    private get uploadingDialog(): Dialog {
        return this.$.uploadingDialog as Dialog;
    }
    private get addDialog(): Dialog {
        return this.$.addDialog as Dialog;
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
        this.addDialog.show();
    }

    protected async addDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action !== 'upload') {
            return;
        }

        try {
            this.uploadingDialog.show();
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
        this.confirmMainImageDialog.show();
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
        this.confirmDeleteDialog.show();
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
