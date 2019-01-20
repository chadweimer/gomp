import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@cwmr/paper-password-input/paper-password-input.js';
import './mixins/gomp-core-mixin.js';
import './shared-styles.js';
class SettingsView extends GompCoreMixin(PolymerElement) {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    --paper-card: {
                        width: 100%;
                    }
                }
                .container {
                    padding: 10px;
                }
                img.responsive {
                    max-width: 100%;
                    max-height: 20em;
                    height: auto;
                }
                paper-fab.green {
                    --paper-fab-background: var(--paper-green-500);
                    --paper-fab-keyboard-focus-background: var(--paper-green-900);
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                }
                paper-button > span {
                    margin-left: 0.5em;
                }
                @media screen and (min-width: 993px) {
                    .container {
                        width: 50%;
                        margin: auto;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    .container {
                        width: 75%;
                        margin: auto;
                    }
                }
                @media screen and (max-width: 600px) {
                }
          </style>
          <div class="container">
              <paper-card>
                  <div class="card-content">
                      <h3>Security Settings</h3>
                      <paper-input label="Username" value="[[username]]" always-float-label="" disabled=""></paper-input>
                      <paper-password-input label="Current Password" value="{{currentPassword}}" always-float-label=""></paper-password-input>
                      <paper-password-input label="New Password" value="{{newPassword}}" always-float-label=""></paper-password-input>
                      <paper-password-input label="Confirm Password" value="{{repeatPassword}}" always-float-label=""></paper-password-input>
                  </div>
                  <div class="card-actions">
                      <paper-button on-click="_onUpdatePasswordClicked">
                          <iron-icon icon="icons:lock-outline"></iron-icon>
                          <span>Update Password</span>
                      <paper-button>
                  </paper-button></paper-button></div>
              </paper-card>
          </div>
          <div class="container">
              <paper-card>
                  <div class="card-content">
                      <h3>Home Settings</h3>
                      <paper-input label="Title" always-float-label="" value="{{homeTitle}}">
                          <paper-icon-button slot="suffix" icon="icons:save" on-click="_onSaveButtonClicked"></paper-icon-button>
                      </paper-input>
                      <form id="homeImageForm" enctype="multipart/form-data">
                          <paper-input-container always-float-label="">
                              <label slot="label">Image</label>
                              <iron-input slot="input">
                                  <input id="homeImageFile" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                              </iron-input>
                              <paper-icon-button slot="suffix" icon="icons:file-upload" on-click="_onUploadButtonClicked"></paper-icon-button>
                            </paper-input-container>
                      </form>
                      <img alt="Home Image" src="[[homeImageUrl]]" class="responsive" hidden\$="[[!homeImageUrl]]">
                  </div>
              </paper-card>
          </div>
          <paper-dialog id="uploadingDialog" with-backdrop="">
              <h3><paper-spinner active=""></paper-spinner>Uploading</h3>
          </paper-dialog>

          <a href="/create"><paper-fab icon="icons:add" class="green"></paper-fab></a>

          <iron-ajax bubbles="" id="getUserAjax" url="/api/v1/users/current" on-response="_handleGetUserResponse"></iron-ajax>
          <iron-ajax bubbles="" id="putPasswordAjax" url="/api/v1/users/current/password" method="PUT" on-response="_handlePutPasswordResponse" ,="" on-error="_handlePutPasswordError"></iron-ajax>
          <iron-ajax bubbles="" id="getSettingsAjax" url="/api/v1/users/current/settings" on-response="_handleGetSettingsResponse"></iron-ajax>
          <iron-ajax bubbles="" id="putSettingsAjax" url="/api/v1/users/current/settings" method="PUT" on-response="_handlePutSettingsResponse" ,="" on-error="_handlePutSettingsError"></iron-ajax>
          <iron-ajax bubbles="" id="postImageAjax" url="/api/v1/uploads" method="POST" on-request="_handlePostImageRequest" on-response="_handlePostImageResponse" ,="" on-error="_handlePostImageError"></iron-ajax>
`;
    }

    static get is() { return 'settings-view'; }

    ready() {
        super.ready();

        if (this.isActive) {
            this._refresh();
        }
    }

    _onUpdatePasswordClicked(e) {
        if (this.newPassword !== this.repeatPassword) {
            this.showToast('Passwords don\'t match.');
            return;
        }

        this.$.putPasswordAjax.body = JSON.stringify({
            'currentPassword': this.currentPassword,
            'newPassword': this.newPassword
        });
        this.$.putPasswordAjax.generateRequest();
    }
    _onSaveButtonClicked(e) {
        this.$.putSettingsAjax.body = JSON.stringify({
            'homeTitle': this.homeTitle,
            'homeImageUrl': this.homeImageUrl,
        });
        this.$.putSettingsAjax.generateRequest();
    }
    _onUploadButtonClicked(e) {
        this.$.postImageAjax.body = new FormData(this.$.homeImageForm);
        this.$.postImageAjax.generateRequest();
    }

    _isActiveChanged(isActive) {
        this.$.homeImageFile.value = null;
        this.currentPassword = null;
        this.newPassword = null;
        this.repeatPassword = null;

        if (isActive && this.isReady) {
            this._refresh();
        }
    }

    _handleGetUserResponse(e) {
        var user = e.detail.response;

        this.username = user.username;
    }
    _handlePutPasswordResponse(e) {
        this.showToast('Password updated.');
    }
    _handlePutPasswordError(e) {
        this.showToast('Password update failed!');
    }
    _handleGetSettingsResponse(e) {
        var userSettings = e.detail.response;

        this.homeTitle = userSettings.homeTitle;
        this.homeImageUrl = userSettings.homeImageUrl;
    }
    _handlePutSettingsResponse(e) {
        this._refresh();
        this.showToast('Settings changed.');
    }
    _handlePutSettingsError(e) {
        this.showToast('Updating settings failed!');
    }
    _handlePostImageRequest(e) {
        this.$.uploadingDialog.open();
    }
    _handlePostImageResponse(e, req) {
        this.$.uploadingDialog.close();
        this.$.homeImageFile.value = null;
        this.showToast('Upload complete.');

        var location = req.xhr.getResponseHeader('Location');
        this.$.putSettingsAjax.body = JSON.stringify({
            'homeTitle': this.homeTitle,
            'homeImageUrl': location,
        });
        this.$.putSettingsAjax.generateRequest();
    }
    _handlePostImageError(e) {
        this.$.uploadingDialog.close();
        this.showToast('Upload failed!');
    }

    _refresh() {
        this.$.getUserAjax.generateRequest();
        this.$.getSettingsAjax.generateRequest();
    }
}

window.customElements.define(SettingsView.is, SettingsView);
