import { Dialog } from '@material/mwc-dialog';
import { TextField } from '@material/mwc-textfield';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { GompBaseElement } from './common/gomp-base-element.js';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { SearchFilterElement } from './components/search-filter.js';
import { DefaultSearchFilter, EventWithModel, SavedSearchFilter, SavedSearchFilterCompact, User, UserSettings } from './models/models.js';
import '@material/mwc-button';
import '@material/mwc-circular-progress';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import '@material/mwc-tab';
import '@material/mwc-tab-bar';
import '@material/mwc-textfield';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-card/paper-card.js';
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
                .padded {
                    padding: 5px 0;
                }
                label {
                    color: var(--secondary-text-color);
                    font-size: 12px;
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
                            <p><mwx-textfield id="homeTitle" class="fill" label="Home Title" value="[[userSettings.homeTitle]]"></mwc-textfield></p>
                            <form id="homeImageForm" enctype="multipart/form-data">
                                <div class="padded">
                                    <label>Home Image</label>
                                    <div class="padded">
                                        <input id="homeImageFile" name="file_content" type="file" accept=".jpg,.jpeg,.png">
                                    </div>
                                    <li divider role="separator"></li>
                                </div>
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
                            <p><mwc-textfield class="fill" label="Username" value="[[currentUser.username]]" disabled></mwc-textfield></p>
                            <p><mwc-textfield class="fill" label="Access Level" value="[[currentUser.accessLevel]]" disabled></mwc-textfield></p>
                            <p><mwc-textfield id="currentPassword" class="fill" label="Current Password" type="password" iconTrailing="visibility_off"></mwc-textfield></p>
                            <p><mwc-textfield id="newPassword" class="fill" label="New Password" type="password" iconTrailing="visibility_off"></mwc-textfield></p>
                            <p><mwc-textfield id="repeatPassword" class="fill" label="Confirm Password" type="password" iconTrailing="visibility_off"></mwc-textfield></p>
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

            <mwc-dialog id="addSearchFilterDialog" heading="Add Search Filter">
                <div>
                    <p><mwc-textfield id="addSearchFilterName" class="fill" label="Name" dialogInitialFocus></mwc-textfield></p>
                    <search-filter id="newSearchFilter"></search-filter>
                </div>
                <mwc-button slot="primaryAction" label="Save" on-click="onAddSearchFilterSaveClicked"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
                </div>
            </mwc-dialog>

            <mwc-dialog id="editSearchFilterDialog" heading="Edit Search Filter">
                <div>
                <p><mwc-textfield id="editSearchFilterName" class="fill" label="Name" value="[[selectedFilter.name]]" dialogInitialFocus></mwc-textfield></p>
                    <search-filter id="editSearchFilter"></search-filter>
                </div>
                <mwc-button slot="primaryAction" label="Save" on-click="onEditSearchFilterSaveClicked"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>

            <confirmation-dialog id="confirmDeleteUserSearchFilterDialog" title="Delete Search Filter?" message="Are you sure you want to delete '[[selectedFilterCompact.name]]'?" on-confirmed="deleteUserSearchFilter"></confirmation-dialog>
`;
    }

    @query('#homeImageForm')
    private homeImageForm!: HTMLFormElement;
    @query('#homeTitle')
    private homeTitle!: TextField;
    @query('#homeImageFile')
    private homeImageFile!: HTMLInputElement;
    @query('#uploadingDialog')
    private uploadingDialog!: Dialog;
    @query('#addSearchFilterDialog')
    private addSearchFilterDialog!: Dialog;
    @query('#newSearchFilter')
    private newSearchFilter!: SearchFilterElement;
    @query('#addSearchFilterName')
    private addSearchFilterName!: TextField;
    @query('#editSearchFilterDialog')
    private editSearchFilterDialog!: Dialog;
    @query('#editSearchFilter')
    private editSearchFilter!: SearchFilterElement;
    @query('#editSearchFilterName')
    private editSearchFilterName!: TextField;
    @query('#confirmDeleteUserSearchFilterDialog')
    private confirmDeleteUserSearchFilterDialog!: ConfirmationDialog;
    @query('#currentPassword')
    private currentPassword!: TextField;
    @query('#newPassword')
    private newPassword!: TextField;
    @query('#repeatPassword')
    private repeatPassword!: TextField;

    @property({type: Object, notify: true})
    public currentUser: User|null = null;

    protected selectedTab = 0;
    protected userSettings: UserSettings|null = null;

    protected filters: SavedSearchFilterCompact[] = [];
    protected selectedFilterCompact: SavedSearchFilterCompact|null = null;
    protected selectedFilter: SavedSearchFilter|null = null;

    public ready() {
        super.ready();

        this.$.tabBar.addEventListener('MDCTabBar:activated', e => this.onTabActivated(e as CustomEvent));

        if (this.isActive) {
            this.refresh();
        }
    }

    protected isActiveChanged(isActive: boolean) {
        this.homeImageFile.value = '';
        this.currentPassword.value = '';
        this.newPassword.value = '';
        this.repeatPassword.value = '';

        if (isActive && this.isReady) {
            this.refresh();
        }
    }

    protected onTabActivated(e: CustomEvent<{index: number}>) {
        this.selectedTab = e.detail.index;
    }

    protected async onUpdatePasswordClicked() {
        const currentPassword = this.getRequiredTextFieldValue(this.currentPassword);
        if (currentPassword == undefined) return;

        const newPassword = this.getRequiredTextFieldValue(this.newPassword);
        if (newPassword == undefined) return;

        const repeatPassword = this.getRequiredTextFieldValue(this.repeatPassword);
        if (repeatPassword == undefined) return;

        if (newPassword !== repeatPassword) {
            this.repeatPassword.setCustomValidity('Passwords don\'t match');
            this.repeatPassword.reportValidity();
            return;
        } else {
            this.repeatPassword.setCustomValidity('');
            this.repeatPassword.reportValidity();
        }

        const passwordDetails = {
            currentPassword: currentPassword,
            newPassword: newPassword,
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
        const homeTitle = this.getRequiredTextFieldValue(this.homeTitle);
        if (homeTitle == undefined) return;

        if (this.userSettings) {
            this.userSettings.homeTitle = homeTitle;
        }

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
        this.addSearchFilterName.value = '';
        this.newSearchFilter.filter = new DefaultSearchFilter();
        this.newSearchFilter.refresh();
        this.addSearchFilterDialog.show();
    }
    protected async onAddSearchFilterSaveClicked() {
        if (!this.currentUser) {
            console.error('Cannot save a search filter for a null user');
            return;
        }

        const filterName = this.getRequiredTextFieldValue(this.addSearchFilterName);
        if (filterName == undefined) return;

        this.addSearchFilterDialog.close();

        const newFilter = {
            ...this.newSearchFilter.filter,
            userId: this.currentUser.id,
            name: filterName,
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
    protected async onEditSearchFilterSaveClicked() {
        if (!this.selectedFilter) {
            console.error('Attempted to edit a null search filter');
            return;
        }

        const filterName = this.getRequiredTextFieldValue(this.editSearchFilterName);
        if (filterName == undefined) return;

        this.editSearchFilterDialog.close();

        const updatedFilter = {
            ...this.editSearchFilter.filter,
            id: this.selectedFilter.id,
            userId: this.selectedFilter.userId,
            name: filterName,
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
