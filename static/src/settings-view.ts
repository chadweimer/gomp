'use strict'
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@cwmr/paper-password-input/paper-password-input.js';
import './shared-styles.js';

@customElement('settings-view')
export class SettingsView extends GompBaseElement {
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
                      <paper-password-input label="Current Password" value="{{_currentPassword}}" always-float-label=""></paper-password-input>
                      <paper-password-input label="New Password" value="{{_newPassword}}" always-float-label=""></paper-password-input>
                      <paper-password-input label="Confirm Password" value="{{_repeatPassword}}" always-float-label=""></paper-password-input>
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
                      <paper-input label="Title" always-float-label="" value="{{_homeTitle}}">
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
                      <img alt="Home Image" src="[[_homeImageUrl]]" class="responsive" hidden\$="[[!_homeImageUrl]]">
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

    @property({type: String})
    username = '';

    private _currentPassword = '';
    private _newPassword = '';
    private _repeatPassword = '';
    private _homeTitle = '';
    private _homeImageUrl = '';

    ready() {
        super.ready();

        if (this.isActive) {
            this._refresh();
        }
    }

    _onUpdatePasswordClicked() {
        if (this._newPassword !== this._repeatPassword) {
            this.showToast('Passwords don\'t match.');
            return;
        }

        let putPasswordAjax = this.$.putPasswordAjax as IronAjaxElement;
        putPasswordAjax.body = <any>JSON.stringify({
            'currentPassword': this._currentPassword,
            'newPassword': this._newPassword
        });
        putPasswordAjax.generateRequest();
    }
    _onSaveButtonClicked() {
        let putSettingsAjax = this.$.putSettingsAjax as IronAjaxElement;
        putSettingsAjax.body = <any>JSON.stringify({
            'homeTitle': this._homeTitle,
            'homeImageUrl': this._homeImageUrl,
        });
        putSettingsAjax.generateRequest();
    }
    _onUploadButtonClicked() {
        let postImageAjax = this.$.postImageAjax as IronAjaxElement;
        postImageAjax.body = new FormData(<HTMLFormElement>this.$.homeImageForm);
        postImageAjax.generateRequest();
    }

    _isActiveChanged(isActive: Boolean) {
        (<HTMLInputElement>this.$.homeImageFile).value = '';
        this._currentPassword = '';
        this._newPassword = '';
        this._repeatPassword = '';

        if (isActive && this.isReady) {
            this._refresh();
        }
    }

    _handleGetUserResponse(e: CustomEvent) {
        var user = e.detail.response;

        this.username = user.username;
    }
    _handlePutPasswordResponse() {
        this.showToast('Password updated.');
    }
    _handlePutPasswordError() {
        this.showToast('Password update failed!');
    }
    _handleGetSettingsResponse(e: CustomEvent) {
        var userSettings = e.detail.response;

        this._homeTitle = userSettings.homeTitle;
        this._homeImageUrl = userSettings.homeImageUrl;
    }
    _handlePutSettingsResponse() {
        this._refresh();
        this.showToast('Settings changed.');
    }
    _handlePutSettingsError() {
        this.showToast('Updating settings failed!');
    }
    _handlePostImageRequest() {
        (<PaperDialogElement>this.$.uploadingDialog).open();
    }
    _handlePostImageResponse(_e: CustomEvent, req: any) {
        (<PaperDialogElement>this.$.uploadingDialog).close();
        (<HTMLInputElement>this.$.homeImageFile).value = '';
        this.showToast('Upload complete.');

        var location = req.xhr.getResponseHeader('Location');
        let putSettingsAjax = this.$.putSettingsAjax as IronAjaxElement;
        putSettingsAjax.body = <any>JSON.stringify({
            'homeTitle': this._homeTitle,
            'homeImageUrl': location,
        });
        putSettingsAjax.generateRequest();
    }
    _handlePostImageError() {
        (<PaperDialogElement>this.$.uploadingDialog).close();
        this.showToast('Upload failed!');
    }

    _refresh() {
        (<IronAjaxElement>this.$.getUserAjax).generateRequest();
        (<IronAjaxElement>this.$.getSettingsAjax).generateRequest();
    }
}
