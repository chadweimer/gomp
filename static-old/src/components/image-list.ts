import { Dialog } from '@material/mwc-dialog';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { PaperMenuButton } from '@polymer/paper-menu-button/paper-menu-button.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import { EventWithTarget, RecipeImage } from '../models/models.js';
import '@material/mwc-circular-progress';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-list/mwc-list';
import '@material/mwc-list/mwc-list-item';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
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
                #uploadingDialog {
                    --mdc-dialog-min-width: unset;
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
                .padded {
                    padding: 5px 0;
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
                label {
                    color: var(--secondary-text-color);
                    font-size: 12px;
                }
            </style>

            <template is="dom-repeat" items="[[images]]">
                <div class="imageContainer">
                    <a target="_blank" href\$="[[item.url]]"><img src="[[item.thumbnailUrl]]" alt="[[item.name]]"></a>
                </div>
                <div hidden\$="[[readonly]]">
                    <paper-menu-button id="imageMenu" dynamic-align class="menu" horizontal-align="right" data-id\$="[[item.id]]">
                        <mwc-icon-button icon="more_vert" slot="dropdown-trigger"></mwc-icon-button>
                        <mwc-list slot="dropdown-content">
                            <mwc-list-item graphic="icon" tabindex="-1" on-click="onSetMainImageClicked">
                                <mwc-icon slot="graphic" class="blue">photo_library</mwc-icon>
                                Set as main picture
                            </mwc-list-item>
                            <mwc-list-item graphic="icon" tabindex="-1" on-click="onDeleteClicked">
                                <mwc-icon slot="graphic" class="red">delete</mwc-icon>
                                Delete
                            </mwc-list-item>
                        </mwc-list>
                    </paper-menu-button>
                </div>
            </template>

            <mwc-dialog id="addDialog" heading="Upload Picture" on-closed="addDialogClosed">
                <div>
                    <p>Browse for a picture to upload to this recipe.</p>
                    <form id="addForm" enctype="multipart/form-data">
                        <div class="padded">
                            <label>Picture</label>
                            <div class="padded">
                                <input name="file_content" type="file" accept=".jpg,.jpeg,.png" required dialogInitialFocus>
                            </div>
                            <li divider role="separator"></li>
                        </div>
                    </form>
                </div>
                <mwc-button slot="primaryAction" label="Upload" dialogAction="upload"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>
            <mwc-dialog id="uploadingDialog" heading="Uploading" hideActions>
                <mwc-circular-progress indeterminate></mwc-circular-progress>
            </mwc-dialog>

            <confirmation-dialog id="confirmMainImageDialog" title="Change Main Picture?" message="Are you sure you want to make this the main picture for the recipe?" on-confirmed="setMainImage"></confirmation-dialog>
            <confirmation-dialog id="confirmDeleteDialog" title="Delete Picture?" message="Are you sure you want to delete this picture?" on-confirmed="deleteImage"></confirmation-dialog>
`;
    }

    @query('#addForm')
    private addForm!: HTMLFormElement;
    @query('#uploadingDialog')
    private uploadingDialog!: Dialog;
    @query('#addDialog')
    private addDialog!: Dialog;
    @query('#confirmMainImageDialog')
    private confirmMainImageDialog!: ConfirmationDialog;
    @query('#confirmDeleteDialog')
    private confirmDeleteDialog!: ConfirmationDialog;

    @property({type: String})
    public recipeId = '';

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected images: RecipeImage[] = [];

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
            await this.AjaxPost(`/api/v1/recipes/${this.recipeId}/images`, new FormData(this.addForm));
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
    protected onSetMainImageClicked(e: EventWithTarget<HTMLElement>) {
        // Don't navigate to "#!"
        e.preventDefault();

        const menu = e.target.closest('#imageMenu') as PaperMenuButton;
        menu.close();

        this.confirmMainImageDialog.dataset.id = menu.dataset.id;
        this.confirmMainImageDialog.show();
    }
    protected async setMainImage(e: EventWithTarget<HTMLElement>) {
        if (!e.target.dataset.id) {
            console.error('Cannot determine id of image to set');
            return;
        }

        const imageId = parseInt(e.target.dataset.id, 10);
        try {
            await this.AjaxPut(`/api/v1/recipes/${this.recipeId}/image`, imageId);
            this.dispatchEvent(new CustomEvent('main-image-changed'));
            this.showToast('Main picture changed.');
        } catch (e) {
            this.showToast('Changing main picture failed!');
            console.error(e);
        }
    }
    protected onDeleteClicked(e: EventWithTarget<HTMLElement>) {
        // Don't navigate to "#!"
        e.preventDefault();

        const menu = e.target.closest('#imageMenu') as PaperMenuButton;
        menu.close();

        this.confirmDeleteDialog.dataset.id = menu.dataset.id;
        this.confirmDeleteDialog.show();
    }
    protected async deleteImage(e: EventWithTarget<HTMLElement>) {
        try {
            await this.AjaxDelete(`/api/v1/images/${e.target.dataset.id}`);
            this.dispatchEvent(new CustomEvent('image-deleted'));
            this.showToast('Picture deleted.');
            await this.refresh();
        } catch (e) {
            this.showToast('Deleting picture failed!');
            console.error(e);
        }
    }
}