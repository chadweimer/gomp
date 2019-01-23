'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
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
                #addDialog h3 {
                    color: var(--paper-teal-500);
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
                .blue {
                    color: var(--paper-blue-500);
                }
                .red {
                    color: var(--paper-red-500);
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
                paper-icon-item {
                    cursor: pointer;
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
              <div>
                  <paper-menu-button id="imageMenu" class="menu" horizontal-align="right">
                      <paper-icon-button icon="icons:more-vert" slot="dropdown-trigger"></paper-icon-button>
                      <paper-listbox slot="dropdown-content">
                          <paper-icon-item data-id="[[item.id]]" on-click="_onSetMainImageClicked"><iron-icon class="blue" icon="image:photo-library" slot="item-icon"></iron-icon> Set as main picture</paper-icon-item>
                          <paper-icon-item data-id="[[item.id]]" on-click="_onDeleteClicked"><iron-icon class="red" icon="icons:delete" slot="item-icon"></iron-icon> Delete</paper-icon-item>
                      </paper-listbox>
                  </paper-menu-button>
              </div>
          </template>

          <paper-dialog id="addDialog" on-iron-overlay-closed="_addDialogClosed" with-backdrop="">
              <h3><iron-icon icon="image:add-a-photo"></iron-icon> <span>Upload Picture</span></h3>
              <p>Browse for a picture to upload to this recipe.</p><p>
              </p><form id="addForm" enctype="multipart/form-data">
                  <paper-input-container always-float-label="">
                      <label slot="label">Picture</label>
                      <iron-input slot="input">
                          <input name="file_content" type="file" accept=".jpg,.jpeg,.png" required="">
                      </iron-input>
                  </paper-input-container>
              </form>
              <div class="buttons">
                  <paper-button dialog-dismiss="">Cancel</paper-button>
                  <paper-button dialog-confirm="">Upload</paper-button>
              </div>
          </paper-dialog>
          <paper-dialog id="uploadingDialog" with-backdrop="">
              <h3><paper-spinner active=""></paper-spinner>Uploading</h3>
          </paper-dialog>

          <confirmation-dialog id="confirmMainImageDialog" title="Change Main Picture?" message="Are you sure you want to make this the main picture for the recipe?" on-confirmed="_setMainImage"></confirmation-dialog>
          <confirmation-dialog id="confirmDeleteDialog" icon="delete" title="Delete Picture?" message="Are you sure you want to delete this picture?" on-confirmed="_deleteImage"></confirmation-dialog>

          <iron-ajax bubbles="" auto="" id="getAjax" url="/api/v1/recipes/[[recipeId]]/images" on-request="_handleGetImagesRequest" on-response="_handleGetImagesResponse"></iron-ajax>
          <iron-ajax bubbles="" id="addAjax" url="/api/v1/recipes/[[recipeId]]/images" method="POST" on-request="_handleAddRequest" on-response="_handleAddResponse" on-error="_handleAddError"></iron-ajax>
          <iron-ajax bubbles="" id="setMainImageAjax" url="/api/v1/recipes/[[recipeId]]/image" method="PUT" on-response="_handleSetMainImageResponse" on-error="_handleSetMainImageError"></iron-ajax>
          <iron-ajax bubbles="" id="deleteAjax" method="DELETE" on-response="_handleDeleteResponse" on-error="_handleDeleteError"></iron-ajax>
`;
    }

    @property({type: String})
    recipeId = '';

    images: any[] = [];

    refresh() {
        if (!this.recipeId) {
            return;
        }

        (<IronAjaxElement>this.$.getAjax).generateRequest();
    }

    add() {
        (<PaperDialogElement>this.$.addDialog).open();
    }

    _addDialogClosed(e: CustomEvent) {
        if (!e.detail.canceled && e.detail.confirmed) {
            let addAjax = this.$.addAjax as IronAjaxElement;
            addAjax.body = new FormData(<HTMLFormElement>this.$.addForm);
            addAjax.generateRequest();
        }
    }
    _onSetMainImageClicked(e: any) {
        e.target.closest('#imageMenu').close();
        let confirmMainImageDialog = this.$.confirmMainImageDialog as ConfirmationDialog;
        confirmMainImageDialog.dataset.id = e.target.dataset.id;
        confirmMainImageDialog.open();
    }
    _setMainImage(e: any) {
        let setMainImageAjax = this.$.setMainImageAjax as IronAjaxElement;
        setMainImageAjax.body = <any>parseInt(e.target.dataset.id, 10);
        setMainImageAjax.generateRequest();
    }
    _onDeleteClicked(e: any) {
        e.target.closest('#imageMenu').close();
        let confirmDeleteDialog = this.$.confirmDeleteDialog as ConfirmationDialog;
        confirmDeleteDialog.dataset.id = e.target.dataset.id;
        confirmDeleteDialog.open();
    }
    _deleteImage(e: any) {
        let deleteAjax = this.$.deleteAjax as IronAjaxElement;
        deleteAjax.url = '/api/v1/images/' + e.target.dataset.id;
        deleteAjax.generateRequest();
    }

    _handleGetImagesRequest() {
        this.images = [];
    }
    _handleGetImagesResponse(e: CustomEvent) {
        this.images = e.detail.response;
    }
    _handleAddRequest() {
        (<PaperDialogElement>this.$.uploadingDialog).open();
    }
    _handleAddResponse() {
        (<PaperDialogElement>this.$.uploadingDialog).close();
        this.refresh();
        this.dispatchEvent(new CustomEvent('image-added'));
        this.showToast('Upload complete.');
    }
    _handleAddError() {
        (<PaperDialogElement>this.$.uploadingDialog).close();
        this.showToast('Upload failed!');
    }
    _handleSetMainImageResponse() {
        this.dispatchEvent(new CustomEvent('main-image-changed'));
        this.showToast('Main picture changed.');
    }
    _handleSetMainImageError() {
        this.showToast('Changing main picture failed!');
    }
    _handleDeleteResponse() {
        this.refresh();
        this.dispatchEvent(new CustomEvent('image-deleted'));
        this.showToast('Picture deleted.');
    }
    _handleDeleteError() {
        this.showToast('Deleting picture failed!');
    }
}
