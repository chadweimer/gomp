'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { SearchFilterElement } from './components/search-filter.js';
import { DefaultSearchFilter, EventWithModel, SavedSearchFilter, SavedSearchFilterCompact, User, UserSettings } from './models/models.js';
import '@material/mwc-icon';
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
import './common/shared-styles.js';
import './components/confirmation-dialog.js';
import './components/search-filter.js';

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
                            <paper-input label="Home Title" always-float-label value="{{userSettings.homeTitle}}"></paper-input>
                            <form id="homeImageForm" enctype="multipart/form-data">
                                <paper-input-container always-float-label>
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
                                                    <mwc-icon class="amber" slot="item-icon">create</mwc-icon>
                                                </a>
                                                <a href="#!" tabindex="-1" on-click="onDeleteFilterClicked">
                                                    <mwc-icon class="red" slot="item-icon">delete</mwc-icon>
                                                </a>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                        <div class="card-actions">
                            <paper-button on-click="onAddFilterClicked">
                                <span>Add</span>
                            <paper-button>
                        </div>
                    </paper-card>
                    <paper-card>
                        <div class="card-content">
                            <paper-input label="Username" value="[[currentUser.username]]" always-float-label disabled></paper-input>
                            <paper-input label="Access Level" value="[[currentUser.accessLevel]]" always-float-label disabled></paper-input>
                            <paper-password-input label="Current Password" value="{{currentPassword}}" always-float-label></paper-password-input>
                            <paper-password-input label="New Password" value="{{newPassword}}" always-float-label></paper-password-input>
                            <paper-password-input label="Confirm Password" value="{{repeatPassword}}" always-float-label></paper-password-input>
                        </div>
                        <div class="card-actions">
                            <paper-button on-click="onUpdatePasswordClicked">
                                <span>Update Password</span>
                            <paper-button>
                        </div>
                    </paper-card>
                </iron-pages>
            </div>

            <paper-dialog id="uploadingDialog" with-backdrop>
                <h3><paper-spinner active></paper-spinner>Uploading</h3>
            </paper-dialog>

            <paper-dialog id="addSearchFilterDialog" on-iron-overlay-closed="addSearchFilterDialogClosed" with-backdrop>
                <h3><mwc-icon class="middle-vertical">search</mwc-icon> <span>Add Search Filter</span></h3>
                <paper-dialog-scrollable>
                    <paper-input label="Name" always-float-label value="{{newFilterName}}"></paper-input>
                    <search-filter id="newSearchFilter"></search-filter>
                </paper-dialog-scrollable>
                <div class="buttons">
                    <paper-button dialog-dismiss>Cancel</paper-button>
                    <paper-button dialog-confirm disabled\$="[[!newFilterName]]">Save</paper-button>
                </div>
            </paper-dialog>

            <paper-dialog id="editSearchFilterDialog" on-iron-overlay-closed="editSearchFilterDialogClosed" with-backdrop>
                <h3><mwc-icon class="middle-vertical">search</mwc-icon> <span>Edit Search Filter</span></h3>
                <paper-dialog-scrollable>
                    <paper-input label="Name" always-float-label value="{{selectedFilter.name}}"></paper-input>
                    <search-filter id="editSearchFilter"></search-filter>
                </paper-dialog-scrollable>
                <div class="buttons">
                    <paper-button dialog-dismiss>Cancel</paper-button>
                    <paper-button dialog-confirm disabled\$="[[!selectedFilter.name]]">Save</paper-button>
                </div>
            </paper-dialog>

            <confirmation-dialog id="confirmDeleteUserSearchFilterDialog" icon="icons:delete" title="Delete Search Filter?" message="Are you sure you want to delete '[[selectedFilterCompact.name]]'?" on-confirmed="deleteUserSearchFilter"></confirmation-dialog>

            <a href="/create"><paper-fab icon="icons:add" class="green"></paper-fab></a>
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

    protected async onUpdatePasswordClicked() {
        if (this.newPassword !== this.repeatPassword) {
            this.showToast('Passwords don\'t match.');
            return;
        }

        const passwordDetails = {
            currentPassword: this.currentPassword,
            newPassword: this.newPassword,
        };
        try {
            await this.AjaxPut('/api/v1/users/current/password', passwordDetails);
            this.showToast('Password updated.');
        } catch (e) {
            this.showToast('Password update failed!');
            console.error(e);
        }
    }
    protected async onSaveButtonClicked() {
        try {
            // First determine if an image must be uploaded first
            if (this.homeImageFile.value) {
                try {
                    this.uploadingDialog.open();
                    const location = await this.AjaxPostWithLocation('/api/v1/uploads', new FormData(this.homeImageForm));
                    this.uploadingDialog.close();

                    this.homeImageFile.value = '';
                    this.showToast('Upload complete.');

                    this.userSettings.homeImageUrl = location;
                } catch (e) {
                    this.uploadingDialog.close();
                    this.showToast('Upload failed!');
                    throw e;
                }
            }

            await this.AjaxPut('/api/v1/users/current/settings', this.userSettings);
            this.showToast('Settings updated.');
            await this.refresh();
        } catch (e) {
            this.showToast('Updating settings failed!');
            console.error(e);
        }
    }
    protected onAddFilterClicked() {
        this.newFilterName = '';
        this.newSearchFilter.filter = new DefaultSearchFilter();
        this.newSearchFilter.refresh();
        this.addSearchFilterDialog.open();
    }
    protected async addSearchFilterDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.detail.canceled || !e.detail.confirmed) {
            return;
        }

        const newFilter = {
            ...this.newSearchFilter.filter,
            userId: this.currentUser.id,
            name: this.newFilterName,
        };
        try {
            await this.AjaxPost('/api/v1/users/current/filters', newFilter);
            this.showToast('Search filter added.');
            await this.refresh();
        } catch (e) {
            this.showToast('Adding search filter failed!');
            console.error(e);
        }
    }
    protected async onEditFilterClicked(e: EventWithModel<{item: SavedSearchFilterCompact}>) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.selectedFilterCompact = e.model.item;
        try {
            this.selectedFilter = await this.AjaxGetWithResult(`/api/v1/users/current/filters/${this.selectedFilterCompact.id}`);
            this.editSearchFilter.filter = this.selectedFilter;
            this.editSearchFilter.refresh();
            this.editSearchFilterDialog.open();
        } catch (e) {
            console.error(e);
        }
    }
    protected async editSearchFilterDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.detail.canceled || !e.detail.confirmed) {
            return;
        }

        const updatedFilter = {
            ...this.editSearchFilter.filter,
            id: this.selectedFilter.id,
            userId: this.selectedFilter.userId,
            name: this.selectedFilter.name,
        };
        try {
            await this.AjaxPut(`/api/v1/users/current/filters/${this.selectedFilterCompact.id}`, updatedFilter);
            this.showToast('Search filter updated.');
            await this.refresh();
        } catch (e) {
            this.showToast('Updating search filter failed!');
            console.error(e);
        }
    }
    protected onDeleteFilterClicked(e: EventWithModel<{item: SavedSearchFilterCompact}>) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.selectedFilterCompact = e.model.item;
        this.confirmDeleteUserSearchFilterDialog.open();
    }
    protected async deleteUserSearchFilter() {
        try {
            await this.AjaxDelete(`/api/v1/users/current/filters/${this.selectedFilterCompact.id}`);
            this.showToast('Search filter deleted.');
            await this.refresh();
        } catch (e) {
            this.showToast('Deleting search filter failed!');
            console.error(e);
        }
    }

    private async refresh() {
        try {
            this.userSettings = await this.AjaxGetWithResult('/api/v1/users/current/settings');
            this.filters = await this.AjaxGetWithResult('/api/v1/users/current/filters');
        } catch (e) {
            console.error(e);
        }
    }
}
