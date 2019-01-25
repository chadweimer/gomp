'use strict';
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
                      <paper-password-input label="Current Password" value="{{currentPassword}}" always-float-label=""></paper-password-input>
                      <paper-password-input label="New Password" value="{{newPassword}}" always-float-label=""></paper-password-input>
                      <paper-password-input label="Confirm Password" value="{{repeatPassword}}" always-float-label=""></paper-password-input>
                  </div>
                  <div class="card-actions">
                      <paper-button on-click="onUpdatePasswordClicked">
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
                          <paper-icon-button slot="suffix" icon="icons:save" on-click="onSaveButtonClicked"></paper-icon-button>
                      </paper-input>
                      <form id="homeImageForm" enctype="multipart/form-data">
                          <paper-input-container always-float-label="">
                              <label slot="label">Image</label>
                              <iron-input slot="input">
                                  <input id="homeImageFile" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                              </iron-input>
                              <paper-icon-button slot="suffix" icon="icons:file-upload" on-click="onUploadButtonClicked"></paper-icon-button>
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

          <iron-ajax bubbles="" id="getUserAjax" url="/api/v1/users/current" on-response="handleGetUserResponse"></iron-ajax>
          <iron-ajax bubbles="" id="putPasswordAjax" url="/api/v1/users/current/password" method="PUT" on-response="handlePutPasswordResponse" ,="" on-error="handlePutPasswordError"></iron-ajax>
          <iron-ajax bubbles="" id="getSettingsAjax" url="/api/v1/users/current/settings" on-response="handleGetSettingsResponse"></iron-ajax>
          <iron-ajax bubbles="" id="putSettingsAjax" url="/api/v1/users/current/settings" method="PUT" on-response="handlePutSettingsResponse" ,="" on-error="handlePutSettingsError"></iron-ajax>
          <iron-ajax bubbles="" id="postImageAjax" url="/api/v1/uploads" method="POST" on-request="handlePostImageRequest" on-response="handlePostImageResponse" ,="" on-error="handlePostImageError"></iron-ajax>
`;
    }

    @property({type: String})
    public username = '';

    private currentPassword = '';
    private newPassword = '';
    private repeatPassword = '';
    private homeTitle = '';
    private homeImageUrl = '';

    private get homeImageForm(): HTMLFormElement {
        return this.$.homeImageForm as HTMLFormElement;
    }
    private get homeImageFile(): HTMLInputElement {
        return this.$.homeImageFile as HTMLInputElement;
    }
    private get uploadingDialog(): PaperDialogElement {
        return this.$.uploadingDialog as PaperDialogElement;
    }
    private get getUserAjax(): IronAjaxElement {
        return this.$.getUserAjax as IronAjaxElement;
    }
    private get getSettingsAjax(): IronAjaxElement {
        return this.$.getSettingsAjax as IronAjaxElement;
    }
    private get putPasswordAjax(): IronAjaxElement {
        return this.$.putPasswordAjax as IronAjaxElement;
    }
    private get putSettingsAjax(): IronAjaxElement {
        return this.$.putSettingsAjax as IronAjaxElement;
    }
    private get postImageAjax(): IronAjaxElement {
        return this.$.postImageAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }

    protected onUpdatePasswordClicked() {
        if (this.newPassword !== this.repeatPassword) {
            this.showToast('Passwords don\'t match.');
            return;
        }

        this.putPasswordAjax.body = JSON.stringify({
            currentPassword: this.currentPassword,
            newPassword: this.newPassword,
        }) as any;
        this.putPasswordAjax.generateRequest();
    }
    protected onSaveButtonClicked() {
        this.putSettingsAjax.body = JSON.stringify({
            homeTitle: this.homeTitle,
            homeImageUrl: this.homeImageUrl,
        }) as any;
        this.putSettingsAjax.generateRequest();
    }
    protected onUploadButtonClicked() {
        this.postImageAjax.body = new FormData(this.homeImageForm);
        this.postImageAjax.generateRequest();
    }

    protected isActiveChanged(isActive: boolean) {
        this.homeImageFile.value = '';
        this.currentPassword = '';
        this.newPassword = '';
        this.repeatPassword = '';

        if (isActive && this.isReady) {
            this.refresh();
        }
    }

    protected handleGetUserResponse(e: CustomEvent) {
        const user = e.detail.response;

        this.username = user.username;
    }
    protected handlePutPasswordResponse() {
        this.showToast('Password updated.');
    }
    protected handlePutPasswordError() {
        this.showToast('Password update failed!');
    }
    protected handleGetSettingsResponse(e: CustomEvent) {
        const userSettings = e.detail.response;

        this.homeTitle = userSettings.homeTitle;
        this.homeImageUrl = userSettings.homeImageUrl;
    }
    protected handlePutSettingsResponse() {
        this.refresh();
        this.showToast('Settings changed.');
    }
    protected handlePutSettingsError() {
        this.showToast('Updating settings failed!');
    }
    protected handlePostImageRequest() {
        this.uploadingDialog.open();
    }
    protected handlePostImageResponse(_: CustomEvent, req: any) {
        this.uploadingDialog.close();
        this.homeImageFile.value = '';
        this.showToast('Upload complete.');

        const location = req.xhr.getResponseHeader('Location');
        this.putSettingsAjax.body = JSON.stringify({
            homeTitle: this.homeTitle,
            homeImageUrl: location,
        }) as any;
        this.putSettingsAjax.generateRequest();
    }
    protected handlePostImageError() {
        this.uploadingDialog.close();
        this.showToast('Upload failed!');
    }

    protected refresh() {
        this.getUserAjax.generateRequest();
        this.getSettingsAjax.generateRequest();
    }
}
