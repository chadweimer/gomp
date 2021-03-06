import { Dialog } from '@material/mwc-dialog';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from './common/gomp-base-element.js';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { SearchFilterElement } from './components/search-filter.js';
import { DefaultSearchFilter, EventWithModel, SavedSearchFilter, SavedSearchFilterCompact, User, UserSettings } from './models/models.js';
import '@material/mwc-circular-progress';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import '@material/mwc-tab';
import '@material/mwc-tab-bar';
import '@polymer/iron-input/iron-input.js';
import '@polymer/iron-pages/iron-pages.js';
import '@material/mwc-button';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-input/paper-input.js';
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
                #uploadingDialog {
                    --mdc-dialog-min-width: unset;
                }
                #confirmDeleteUserSearchFilterDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
            </style>
            <div class="container padded-10">
                <mwc-tab-bar id="tabBar" activeIndex="[[selectedTab]]">
                    <mwc-tab label="Preferences"></mwc-tab>
                    <mwc-tab label="Searches"></mwc-tab>
                    <mwc-tab label="Security"></mwc-tab>
                </mwc-tab-bar>

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
                            <mwc-button label="Save" on-click="onSaveButtonClicked"></mwc-button>
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
                            <mwc-button label="Add" on-click="onAddFilterClicked"></mwc-button>
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
                            <mwc-button label="Update Password" on-click="onUpdatePasswordClicked"></mwc-button>
                        </div>
                    </paper-card>
                </iron-pages>
            </div>

            <mwc-dialog id="uploadingDialog" heading="Uploading" hideActions>
                <mwc-circular-progress indeterminate></mwc-circular-progress>
            </mwc-dialog>

            <mwc-dialog id="addSearchFilterDialog" heading="Add Search Filter" on-closed="addSearchFilterDialogClosed">
                <div>
                    <paper-input label="Name" always-float-label value="{{newFilterName}}" dialogInitialFocus></paper-input>
                    <search-filter id="newSearchFilter"></search-filter>
                </div>
                <mwc-button slot="primaryAction" label="Save" dialogAction="save"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
                </div>
            </mwc-dialog>

            <mwc-dialog id="editSearchFilterDialog" heading="Edit Search Filter" on-closed="editSearchFilterDialogClosed">
                <div>
                    <paper-input label="Name" always-float-label value="{{selectedFilter.name}}" dialogInitialFocus></paper-input>
                    <search-filter id="editSearchFilter"></search-filter>
                </div>
                <mwc-button slot="primaryAction" label="Save" dialogAction="save"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>

            <confirmation-dialog id="confirmDeleteUserSearchFilterDialog" title="Delete Search Filter?" message="Are you sure you want to delete '[[selectedFilterCompact.name]]'?" on-confirmed="deleteUserSearchFilter"></confirmation-dialog>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User|null = null;

    protected selectedTab = 0;
    protected userSettings: UserSettings|null = null;

    protected filters: SavedSearchFilterCompact[] = [];
    protected selectedFilterCompact: SavedSearchFilterCompact|null = null;
    protected selectedFilter: SavedSearchFilter|null = null;
    protected newFilterName = '';

    private currentPassword = '';
    private newPassword = '';
    private repeatPassword = '';

    private get homeImageForm() {
        return this.$.homeImageForm as HTMLFormElement;
    }
    private get homeImageFile() {
        return this.$.homeImageFile as HTMLInputElement;
    }
    private get uploadingDialog() {
        return this.$.uploadingDialog as Dialog;
    }
    private get addSearchFilterDialog() {
        return this.$.addSearchFilterDialog as Dialog;
    }
    private get newSearchFilter() {
        return this.$.newSearchFilter as SearchFilterElement;
    }
    private get editSearchFilterDialog() {
        return this.$.editSearchFilterDialog as Dialog;
    }
    private get editSearchFilter() {
        return this.$.editSearchFilter as SearchFilterElement;
    }
    private get confirmDeleteUserSearchFilterDialog() {
        return this.$.confirmDeleteUserSearchFilterDialog as ConfirmationDialog;
    }

    public ready() {
        super.ready();

        this.$.tabBar.addEventListener('MDCTabBar:activated', e => this.onTabActivated(e as CustomEvent));

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

    protected onTabActivated(e: CustomEvent<{index: number}>) {
        this.selectedTab = e.detail.index;
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
                    this.uploadingDialog.show();
                    const location = await this.AjaxPostWithLocation('/api/v1/uploads', new FormData(this.homeImageForm));
                    this.uploadingDialog.close();

                    this.homeImageFile.value = '';
                    this.showToast('Upload complete.');

                    if (this.userSettings) {
                        this.userSettings.homeImageUrl = location;
                    }
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
        this.addSearchFilterDialog.show();
    }
    protected async addSearchFilterDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action !== 'save') {
            return;
        }

        if (!this.currentUser) {
            console.error('Cannot save a search filter for a null user');
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
            this.selectedFilter = await this.AjaxGetWithResult<SavedSearchFilter>(`/api/v1/users/current/filters/${this.selectedFilterCompact.id}`);
            this.editSearchFilter.filter = this.selectedFilter;
            this.editSearchFilter.refresh();
            this.editSearchFilterDialog.show();
        } catch (e) {
            console.error(e);
        }
    }
    protected async editSearchFilterDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action !== 'save') {
            return;
        }

        if (!this.selectedFilter) {
            console.error('Attempted to edit a null search filter');
            return;
        }

        const updatedFilter = {
            ...this.editSearchFilter.filter,
            id: this.selectedFilter.id,
            userId: this.selectedFilter.userId,
            name: this.selectedFilter.name,
        };
        try {
            await this.AjaxPut(`/api/v1/users/current/filters/${updatedFilter.id}`, updatedFilter);
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
        this.confirmDeleteUserSearchFilterDialog.show();
    }
    protected async deleteUserSearchFilter() {
        if (!this.selectedFilterCompact) {
            console.error('Cannot delete a null search filter');
            return;
        }

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
