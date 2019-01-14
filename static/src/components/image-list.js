import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
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
import '../mixins/gomp-core-mixin.js';
import './confirmation-dialog.js';
import '../shared-styles.js';
class ImageList extends GompCoreMixin(GestureEventListeners(PolymerElement)) {
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
                          <paper-icon-item data-id="[[item.id]]" on-tap="_setMainImageTapped"><iron-icon class="blue" icon="image:photo-library" slot="item-icon"></iron-icon> Set as main picture</paper-icon-item>
                          <paper-icon-item data-id="[[item.id]]" on-tap="_deleteTapped"><iron-icon class="red" icon="icons:delete" slot="item-icon"></iron-icon> Delete</paper-icon-item>
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

    static get is() { return 'image-list'; }
    static get properties() {
        return {
            recipeId: {
                type: String,
            },
        };
    }

    refresh() {
        if (!this.recipeId) {
            return;
        }

        this.$.getAjax.generateRequest();
    }

    add() {
        this.$.addDialog.open();
    }

    _addDialogClosed(e) {
        if (e.detail.confirmed) {
            this.$.addAjax.body = new FormData(this.$.addForm);
            this.$.addAjax.generateRequest();
        }
    }
    _setMainImageTapped(e) {
        e.preventDefault();

        e.target.closest('#imageMenu').close();
        this.$.confirmMainImageDialog.dataId = e.target.dataId;
        this.$.confirmMainImageDialog.open();
    }
    _setMainImage(e) {
        this.$.setMainImageAjax.body = parseInt(e.target.dataId, 10);
        this.$.setMainImageAjax.generateRequest();
    }
    _deleteTapped(e) {
        e.preventDefault();

        e.target.closest('#imageMenu').close();
        this.$.confirmDeleteDialog.dataId = e.target.dataId;
        this.$.confirmDeleteDialog.open();
    }
    _deleteImage(e) {
        this.$.deleteAjax.url = '/api/v1/images/' + e.target.dataId;
        this.$.deleteAjax.generateRequest();
    }

    _handleGetImagesRequest(e) {
        this.images = [];
    }
    _handleGetImagesResponse(e) {
        this.images = e.detail.response;
    }
    _handleAddRequest(e) {
        this.$.uploadingDialog.open();
    }
    _handleAddResponse(e) {
        this.$.uploadingDialog.close();
        this.refresh();
        this.dispatchEvent(new CustomEvent('image-added'));
        this.showToast('Upload complete.');
    }
    _handleAddError(e) {
        this.$.uploadingDialog.close();
        this.showToast('Upload failed!');
    }
    _handleSetMainImageResponse(e) {
        this.dispatchEvent(new CustomEvent('main-image-changed'));
        this.showToast('Main picture changed.');
    }
    _handleSetMainImageError(e) {
        this.showToast('Changing main picture failed!');
    }
    _handleDeleteResponse(e) {
        this.refresh();
        this.dispatchEvent(new CustomEvent('image-deleted'));
        this.showToast('Picture deleted.');
    }
    _handleDeleteError(e) {
        this.showToast('Deleting picture failed!');
    }
}

window.customElements.define(ImageList.is, ImageList);
