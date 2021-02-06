'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { SearchFilterElement } from './components/search-filter.js';
import { DefaultSearchFilter, EventWithModel, SavedSearchFilter, SavedSearchFilterCompact, User, UserSettings } from './models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-input/iron-input.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@cwmr/paper-password-input/paper-password-input.js';
import '@cwmr/paper-tags-input/paper-tags-input.js';
import './components/confirmation-dialog.js';
import './components/search-filter.js';
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
                paper-button > span {
                    margin-left: 0.5em;
                }
                #confirmDeleteUserSearchFilterDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
            </style>
            <div class="container padded-10">
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
                                <thead class="text-left">
                                    <tr>
                                        <th>Name</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template is="dom-repeat" items="[[filters]]">
                                        <tr>
                                            <td>[[item.name]]</td>
                                            <td class="text-right">
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

            <paper-dialog id="addSearchFilterDialog" on-iron-overlay-closed="addSearchFilterDialogClosed" with-backdrop="">
                <h3><iron-icon icon="icons:search"></iron-icon> <span>Add Search Filter</span></h3>
                <paper-dialog-scrollable>
                    <paper-input label="Name" always-float-label="" value="{{newFilterName}}"></paper-input>
                    <search-filter id="newSearchFilter"></search-filter>
                </paper-dialog-scrollable>
                <div class="buttons">
                    <paper-button dialog-dismiss="">Cancel</paper-button>
                    <paper-button dialog-confirm="" disabled\$="[[!newFilterName]]">Save</paper-button>
                </div>
            </paper-dialog>

            <paper-dialog id="editSearchFilterDialog" on-iron-overlay-closed="editSearchFilterDialogClosed" with-backdrop="">
                <h3><iron-icon icon="icons:search"></iron-icon> <span>Edit Search Filter</span></h3>
                <paper-dialog-scrollable>
                    <paper-input label="Name" always-float-label="" value="{{selectedFilter.name}}"></paper-input>
                    <search-filter id="editSearchFilter"></search-filter>
                </paper-dialog-scrollable>
                <div class="buttons">
                    <paper-button dialog-dismiss="">Cancel</paper-button>
                    <paper-button dialog-confirm="" disabled\$="[[!selectedFilter.name]]">Save</paper-button>
                </div>
            </paper-dialog>

            <confirmation-dialog id="confirmDeleteUserSearchFilterDialog" icon="icons:delete" title="Delete Search Filter?" message="Are you sure you want to delete '[[selectedFilterCompact.name]]'?" on-confirmed="deleteUserSearchFilter"></confirmation-dialog>

            <a href="/create"><paper-fab icon="icons:add" class="green"></paper-fab></a>

            <iron-ajax bubbles="" id="putPasswordAjax" url="/api/v1/users/current/password" method="PUT" on-response="handlePutPasswordResponse" on-error="handlePutPasswordError"></iron-ajax>
            <iron-ajax bubbles="" id="getSettingsAjax" url="/api/v1/users/current/settings" on-response="handleGetSettingsResponse"></iron-ajax>
            <iron-ajax bubbles="" id="putSettingsAjax" url="/api/v1/users/current/settings" method="PUT" on-response="handlePutSettingsResponse" on-error="handlePutSettingsError"></iron-ajax>
            <iron-ajax bubbles="" id="postImageAjax" url="/api/v1/uploads" method="POST" on-request="handlePostImageRequest" on-response="handlePostImageResponse" on-error="handlePostImageError"></iron-ajax>
            <iron-ajax bubbles="" id="getUserSearchFiltersAjax" url="/api/v1/users/current/filters" on-response="handleGetUserSearchFiltersResponse"></iron-ajax>
            <iron-ajax bubbles="" id="getUserSearchFilterAjax" url="/api/v1/users/current/filters/[[selectedFilterCompact.id]]" on-response="handleGetUserSearchFilterResponse"></iron-ajax>
            <iron-ajax bubbles="" id="postUserSearchFilterAjax" url="/api/v1/users/current/filters" method="POST" on-response="handlePostUserSearchFilterResponse" on-error="handlePostUserSearchFilterError"></iron-ajax>
            <iron-ajax bubbles="" id="putUserSearchFilterAjax" url="/api/v1/users/current/filters/[[selectedFilterCompact.id]]" method="PUT" on-response="handlePutUserSearchFilterResponse" on-error="handlePutUserSearchFilterError"></iron-ajax>
            <iron-ajax bubbles="" id="deleteUserSearchFilterAjax" url="/api/v1/users/current/filters/[[selectedFilterCompact.id]]" method="DELETE" on-response="handleDeleteUserSearchFilterResponse" on-error="handleDeleteUserSearchFilterError"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User = null;

    protected userSettings: UserSettings = null;

    protected filters: SavedSearchFilterCompact[] = [];
    protected selectedFilterCompact: SavedSearchFilterCompact = null;
    protected selectedFilter: SavedSearchFilter = null;
    protected newFilterName = '';

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
    private get addSearchFilterDialog(): PaperDialogElement {
        return this.$.addSearchFilterDialog as PaperDialogElement;
    }
    private get newSearchFilter(): SearchFilterElement {
        return this.$.newSearchFilter as SearchFilterElement;
    }
    private get editSearchFilterDialog(): PaperDialogElement {
        return this.$.editSearchFilterDialog as PaperDialogElement;
    }
    private get confirmDeleteUserSearchFilterDialog(): PaperDialogElement {
        return this.$.confirmDeleteUserSearchFilterDialog as PaperDialogElement;
    }
    private get editSearchFilter(): SearchFilterElement {
        return this.$.editSearchFilter as SearchFilterElement;
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
    private get getUserSearchFilterAjax(): IronAjaxElement {
        return this.$.getUserSearchFilterAjax as IronAjaxElement;
    }
    private get postUserSearchFilterAjax(): IronAjaxElement {
        return this.$.postUserSearchFilterAjax as IronAjaxElement;
    }
    private get putUserSearchFilterAjax(): IronAjaxElement {
        return this.$.putUserSearchFilterAjax as IronAjaxElement;
    }
    private get deleteUserSearchFilterAjax(): IronAjaxElement {
        return this.$.deleteUserSearchFilterAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        this.set('selectedTab', 0);

        if (this.isActive) {
            this.refresh();
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
    protected onAddFilterClicked() {
        this.newFilterName = '';
        this.newSearchFilter.filter = new DefaultSearchFilter();
        this.newSearchFilter.refresh();
        this.addSearchFilterDialog.open();
    }
    protected addSearchFilterDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.detail.canceled || !e.detail.confirmed) {
            return;
        }

        const newFilter = {
            ...this.newSearchFilter.filter,
            userId: this.currentUser.id,
            name: this.newFilterName,
        };
        this.postUserSearchFilterAjax.body = JSON.stringify(newFilter) as any;
        this.postUserSearchFilterAjax.generateRequest();
    }
    protected onEditFilterClicked(e: EventWithModel<{item: SavedSearchFilterCompact}>) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.selectedFilterCompact = e.model.item;
        this.getUserSearchFilterAjax.generateRequest();
    }
    protected editSearchFilterDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.detail.canceled || !e.detail.confirmed) {
            return;
        }

        const updatedFilter = {
            ...this.editSearchFilter.filter,
            id: this.selectedFilter.id,
            userId: this.selectedFilter.userId,
            name: this.selectedFilter.name,
        };
        this.putUserSearchFilterAjax.body = JSON.stringify(updatedFilter) as any;
        this.putUserSearchFilterAjax.generateRequest();
    }
    protected onDeleteFilterClicked(e: EventWithModel<{item: SavedSearchFilterCompact}>) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.selectedFilterCompact = e.model.item;
        this.confirmDeleteUserSearchFilterDialog.open();
    }
    protected deleteUserSearchFilter() {
        this.deleteUserSearchFilterAjax.generateRequest();
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
    protected handleGetUserSearchFiltersResponse(e: CustomEvent<{response: SavedSearchFilterCompact[]}>) {
        this.filters = e.detail.response;
    }
    protected handleGetUserSearchFilterResponse(e: CustomEvent<{response: SavedSearchFilter}>) {
        this.selectedFilter = e.detail.response;
        this.editSearchFilter.filter = this.selectedFilter;
        this.editSearchFilter.refresh();
        this.editSearchFilterDialog.open();
    }
    protected handlePostUserSearchFilterResponse() {
        this.refresh();
        this.showToast('Search filter added.');
    }
    protected handlePostUserSearchFilterError() {
        this.showToast('Adding search filter failed!');
    }
    protected handlePutUserSearchFilterResponse() {
        this.refresh();
        this.showToast('Search filter updated.');
    }
    protected handlePutUserSearchFilterError() {
        this.showToast('Updating search filter failed!');
    }
    protected handleDeleteUserSearchFilterResponse() {
        this.refresh();
        this.showToast('Search filter deleted.');
    }
    protected handleDeleteUserSearchFilterError() {
        this.showToast('Deleting search filter failed!');
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
