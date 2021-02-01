'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { SavedSearchFilter, User, UserSettings } from './models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@cwmr/paper-password-input/paper-password-input.js';
import '@cwmr/paper-tags-input/paper-tags-input.js';
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
                    --paper-tabs-selection-bar-color: var(--accent-color);
                }
                .container {
                    padding: 10px;
                }
                .amber {
                    color: var(--paper-amber-500);
                }
                .red {
                    color: var(--paper-red-500);
                }
                .fill {
                    width: 100%
                }
                .left {
                    text-align: left;
                }
                .right {
                    text-align: right;
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
                <paper-tabs selected="{{selectedTab}}">
                    <paper-tab>Preferences</paper-tab>
                    <paper-tab>Searches</paper-tab>
                    <paper-tab>Security</paper-tab>
                </paper-tabs>

                <iron-pages selected="[[selectedTab]]">
                    <paper-card>
                        <div class="card-content">
                            <paper-tags-input id="tags" label="Favorite Tags" tags="{{userSettings.favoriteTags}}"></paper-tags-input>
                            <paper-input label="Home Title" always-float-label="" value="{{userSettings.homeTitle}}"></paper-input>
                            <form id="homeImageForm" enctype="multipart/form-data">
                                <paper-input-container always-float-label="">
                                    <label slot="label">Home Image</label>
                                    <iron-input slot="input">
                                        <input id="homeImageFile" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                                    </iron-input>
                                </paper-input-container>
                            </form>
                            <img alt="Home Image" src="[[userSettings.homeImageUrl]]" class="responsive" hidden\$="[[!userSettings.homeImageUrl]]">
                        </div>
                        <div class="card-actions">
                            <paper-button on-click="onSaveButtonClicked">
                                <iron-icon icon="icons:save"></iron-icon>
                                <span>Save</span>
                            <paper-button>
                        </div>
                    </paper-card>
                    <paper-card>
                        <div class="card-content">
                            <table class="fill">
                                <thead class="left">
                                    <tr>
                                        <th>Name</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template is="dom-repeat" items="[[filters]]">
                                        <tr>
                                            <td>[[item.name]]</td>
                                            <td class="right">
                                                <a href="#!" tabindex="-1" on-click="onEditFilterClicked">
                                                    <iron-icon class="amber" icon="icons:create" slot="item-icon"></iron-icon>
                                                </a>
                                                <a href="#!" tabindex="-1" on-click="onDeleteFilterClicked">
                                                    <iron-icon class="red" icon="icons:delete" slot="item-icon"></iron-icon>
                                                </a>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                        <div class="card-actions">
                            <paper-button on-click="onAddFilterClicked">
                                <iron-icon icon="icons:search"></iron-icon>
                                <span>Add</span>
                            <paper-button>
                        </div>
                    </paper-card>
                    <paper-card>
                        <div class="card-content">
                            <paper-input label="Username" value="[[currentUser.username]]" always-float-label="" disabled=""></paper-input>
                            <paper-input label="Access Level" value="[[currentUser.accessLevel]]" always-float-label="" disabled=""></paper-input>
                            <paper-password-input label="Current Password" value="{{currentPassword}}" always-float-label=""></paper-password-input>
                            <paper-password-input label="New Password" value="{{newPassword}}" always-float-label=""></paper-password-input>
                            <paper-password-input label="Confirm Password" value="{{repeatPassword}}" always-float-label=""></paper-password-input>
                        </div>
                        <div class="card-actions">
                            <paper-button on-click="onUpdatePasswordClicked">
                                <iron-icon icon="icons:lock-outline"></iron-icon>
                                <span>Update Password</span>
                            <paper-button>
                        </div>
                    </paper-card>
                </iron-pages>
            </div>
            <paper-dialog id="uploadingDialog" with-backdrop="">
                <h3><paper-spinner active=""></paper-spinner>Uploading</h3>
            </paper-dialog>

            <a href="/create"><paper-fab icon="icons:add" class="green"></paper-fab></a>

            <iron-ajax bubbles="" id="putPasswordAjax" url="/api/v1/users/current/password" method="PUT" on-response="handlePutPasswordResponse" on-error="handlePutPasswordError"></iron-ajax>
            <iron-ajax bubbles="" id="getSettingsAjax" url="/api/v1/users/current/settings" on-response="handleGetSettingsResponse"></iron-ajax>
            <iron-ajax bubbles="" id="putSettingsAjax" url="/api/v1/users/current/settings" method="PUT" on-response="handlePutSettingsResponse" on-error="handlePutSettingsError"></iron-ajax>
            <iron-ajax bubbles="" id="postImageAjax" url="/api/v1/uploads" method="POST" on-request="handlePostImageRequest" on-response="handlePostImageResponse" on-error="handlePostImageError"></iron-ajax>
            <iron-ajax bubbles="" id="getUserSearchFiltersAjax" url="/api/v1/users/current/filters" on-response="handleGetUserSearchFiltersResponse"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User = null;

    protected userSettings: UserSettings = null;
    protected filters: SavedSearchFilter[] = [];

    private currentPassword = '';
    private newPassword = '';
    private repeatPassword = '';

    private get homeImageForm(): HTMLFormElement {
        return this.$.homeImageForm as HTMLFormElement;
    }
    private get homeImageFile(): HTMLInputElement {
        return this.$.homeImageFile as HTMLInputElement;
    }
    private get uploadingDialog(): PaperDialogElement {
        return this.$.uploadingDialog as PaperDialogElement;
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
    private get getUserSearchFiltersAjax(): IronAjaxElement {
        return this.$.getUserSearchFiltersAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        this.set('selectedTab', 0);

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
        // If there's no image to upload, go directly to saving
        if (!this.homeImageFile.value) {
            this.saveSettings();
        } else {
            // We start by uploading the image, after which the rest of the settings will be saved
            this.postImageAjax.body = new FormData(this.homeImageForm);
            this.postImageAjax.generateRequest();
        }
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

    protected handlePutPasswordResponse() {
        this.showToast('Password updated.');
    }
    protected handlePutPasswordError() {
        this.showToast('Password update failed!');
    }
    protected handleGetSettingsResponse(e: CustomEvent<{response: UserSettings}>) {
        this.userSettings = e.detail.response;
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
        this.userSettings.homeImageUrl = location;
        this.saveSettings();
    }
    protected handlePostImageError() {
        this.uploadingDialog.close();
        this.showToast('Upload failed!');
    }
    protected handleGetUserSearchFiltersResponse(e: CustomEvent<{response: SavedSearchFilter[]}>) {
        this.filters = e.detail.response;
    }

    private saveSettings() {
        this.putSettingsAjax.body = JSON.stringify(this.userSettings) as any;
        this.putSettingsAjax.generateRequest();
    }

    protected refresh() {
        this.getSettingsAjax.generateRequest();
        this.getUserSearchFiltersAjax.generateRequest();
    }
}
