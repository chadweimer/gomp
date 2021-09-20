import { Dialog } from '@material/mwc-dialog';
import { Select } from '@material/mwc-select';
import { TextField } from '@material/mwc-textfield';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { User, EventWithModel, AppConfiguration, AccessLevel } from './models/models.js';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import '@material/mwc-select';
import '@material/mwc-tab';
import '@material/mwc-tab-bar';
import '@material/mwc-textfield';
import '@polymer/paper-card/paper-card.js';
import './common/shared-styles.js';
import './components/confirmation-dialog.js';

@customElement('admin-view')
export class AdminView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    --paper-card: {
                        width: 100%;
                    }
                }
                #confirmDeleteUserDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
            </style>
            <div class="container padded-10">
                <mwc-tab-bar id="tabBar" activeIndex="[[selectedTab]]">
                    <mwc-tab label="Configuration"></mwc-tab>
                    <mwc-tab label="Users"></mwc-tab>
                </mwc-tab-bar>

                <iron-pages selected="[[selectedTab]]">
                    <paper-card>
                        <div class="card-content">
                            <mwc-textfield id="appTitle" class="fill" label="Application Title" value="[[appConfig.title]]"></mwc-textfield>
                        </div>
                        <div class="card-actions">
                            <mwc-button label="Save" on-click="onSaveAppConfigClicked"></mwc-button>
                        </div>
                    </paper-card>
                    <paper-card>
                        <div class="card-content">
                            <table class="fill">
                                <thead class="text-left">
                                    <tr>
                                        <th>Email</th>
                                        <th>Access Level</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template is="dom-repeat" items="[[users]]">
                                        <tr>
                                            <td>[[item.username]]</td>
                                            <td>[[item.accessLevel]]</td>
                                            <td class="text-right">
                                                <a href="#!" tabindex="-1" on-click="onEditUserClicked">
                                                    <mwc-icon class="amber" slot="item-icon">create</mwc-icon>
                                                </a>
                                                <a href="#!" tabindex="-1" on-click="onDeleteUserClicked">
                                                    <mwc-icon class="red" slot="item-icon">delete</mwc-icon>
                                                </a>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                        <div class="card-actions">
                            <mwc-button label="Add" on-click="onAddUserClicked"></mwc-button>
                        </div>
                    </paper-card>
                </iron-pages>
            </div>

            <mwc-dialog id="addUserDialog" heading="Add User" on-opening="addUserDialogOpening">
                <div>
                    <p><mwc-textfield id="addUserUsername" class="fill" label="Email" type="email" value="[[user.username]]" dialogInitialFocus></mwc-textfield></p>
                    <p>
                        <mwc-select id="addUserAccessLevel" class="fill" label="Access Level" value="[[user.accessLevel]]">
                            <template is="dom-repeat" items="[[availableAccessLevels]]">
                                <mwc-list-item value="[[item.value]]">[[item.name]]</mwc-list-item>
                            </template>
                        </mwc-select>
                    </p>
                    <p><mwc-textfield id="addUserPassword" class="fill" label="New Password" type="password" iconTrailing="visibility_off" value="[[user.password]]"></mwc-textfield></p>
                    <p><mwc-textfield id="addUserRepeatPassword" class="fill" label="Confirm Password" type="password" iconTrailing="visibility_off" value="[[user.repeatPassword]]"></mwc-textfield></p>
                </div>

                <mwc-button slot="primaryAction" label="Save" on-click="onAddUserSaveClicked"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>

            <mwc-dialog id="editUserDialog" heading="Edit User" on-opening="editUserDialogOpening">
                <div>
                    <p><mwc-textfield class="fill" label="Email" type="email" value="[[user.username]]" disabled></mwc-textfield></p>
                    <p>
                        <mwc-select id="editUserAccessLevel" class="fill" label="Access Level" value="[[user.accessLevel]]">
                            <template is="dom-repeat" items="[[availableAccessLevels]]">
                                <mwc-list-item value="[[item.value]]">[[item.name]]</mwc-list-item>
                            </template>
                        </mwc-select>
                    </p>
                </div>

                <mwc-button slot="primaryAction" label="Save" on-click="onEditUserSaveClicked"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>

            <confirmation-dialog id="confirmDeleteUserDialog" title="Delete User?" message="Are you sure you want to delete '[[user.username]]'?" on-confirmed="deleteUser"></confirmation-dialog>
`;
    }

    protected availableAccessLevels = [
        {name: 'Administrator', value: AccessLevel.Administrator},
        {name: 'Editor', value: AccessLevel.Editor},
        {name: 'Viewer', value: AccessLevel.Viewer}
    ];

    @query('#appTitle')
    private appTitle!: TextField;
    @query('#addUserDialog')
    private addUserDialog!: Dialog;
    @query('#addUserUsername')
    private addUserUsername!: TextField;
    @query('#addUserAccessLevel')
    private addUserAccessLevel!: Select;
    @query('#addUserPassword')
    private addUserPassword!: TextField;
    @query('#addUserRepeatPassword')
    private addUserRepeatPassword!: TextField;
    @query('#editUserDialog')
    private editUserDialog!: Dialog;
    @query('#editUserAccessLevel')
    private editUserAccessLevel!: Select;
    @query('#confirmDeleteUserDialog')
    private confirmDeleteUserDialog!: ConfirmationDialog;

    @property({type: Object, notify: true})
    public currentUser: User|null = null;

    protected selectedTab = 0;
    protected appConfig: AppConfiguration|null = null;
    protected users: User[] = [];
    protected userId: number|null = null;
    protected user: {
        username: string,
        accessLevel: string,
        password: string,
        repeatPassword: string
    }|null = null;

    public ready() {
        super.ready();

        this.$.tabBar.addEventListener('MDCTabBar:activated', e => this.onTabActivated(e as CustomEvent));

        if (this.isActive) {
            this.refresh();
        }
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive && this.isReady) {
            this.refresh();
        }
    }

    private async refresh() {
        try {
            this.appConfig = await this.AjaxGetWithResult('/api/v1/app/configuration');
            this.users = await this.AjaxGetWithResult('/api/v1/users');
        } catch (e) {
            console.error(e);
        }
    }

    protected onTabActivated(e: CustomEvent<{index: number}>) {
        this.selectedTab = e.detail.index;
    }

    protected async onSaveAppConfigClicked() {
        const appTitle = this.getRequiredTextFieldValue(this.appTitle);
        if (appTitle == undefined) return;

        this.appConfig = {
            title: appTitle
        };
        try {
            await this.AjaxPut('/api/v1/app/configuration', this.appConfig);
            this.showToast('Configuration changed.');
            this.dispatchEvent(new CustomEvent('app-config-changed', {bubbles: true, composed: true, detail: this.appConfig}));
        } catch (e) {
            this.showToast('Updating configuration failed!');
            console.error(e);
        }
    }

    protected onAddUserClicked() {
        this.userId = null;
        this.user = {
            username: '',
            accessLevel: AccessLevel.Editor,
            password: '',
            repeatPassword: ''
        };
        this.addUserDialog.show();
    }

    protected addUserDialogOpening() {
        this.hackDialogForInnerOverlays(this.addUserDialog);
    }

    protected async onAddUserSaveClicked() {
        const username = this.getRequiredTextFieldValue(this.addUserUsername);
        if (username == undefined) return;

        if (this.addUserPassword.value !== this.addUserRepeatPassword.value) {
            this.addUserRepeatPassword.setCustomValidity('Passwords do not match');
            this.addUserRepeatPassword.reportValidity();
            return;
        } else {
            this.addUserRepeatPassword.setCustomValidity('');
            this.addUserRepeatPassword.reportValidity();
        }

        this.addUserDialog.close();

        const userDetails = {
            username: this.addUserUsername.value,
            accessLevel: this.addUserAccessLevel.value,
            password: this.addUserPassword.value
        };
        try {
            await this.AjaxPost('/api/v1/users', userDetails);
            this.showToast('User created.');
            await this.refresh();
        } catch (e) {
            this.showToast('Creating user failed!');
            console.error(e);
        }
    }

    protected onEditUserClicked(e: EventWithModel<{item: User}>) {
        // Don't navigate to "#!"
        e.preventDefault();

        const selectedUser = e.model.item;

        this.userId = selectedUser.id ?? null;
        this.user = {
            username: selectedUser.username,
            accessLevel: selectedUser.accessLevel,
            password: '',
            repeatPassword: ''
        };
        this.editUserDialog.show();
    }

    protected editUserDialogOpening() {
        this.hackDialogForInnerOverlays(this.editUserDialog);
    }

    protected async onEditUserSaveClicked() {
        this.editUserDialog.close();

        if (!this.user || this.userId == null) {
            console.error('Attempted to edit a null user');
            return;
        }

        const userDetails: User = {
            id: this.userId,
            username: this.user.username,
            accessLevel: this.editUserAccessLevel.value
        };
        try {
            await this.AjaxPut(`/api/v1/users/${this.userId}`, userDetails);
            this.showToast('User updated.');
            await this.refresh();
        } catch (e) {
            this.showToast('Updating user failed!');
            console.error(e);
        }
    }

    protected onDeleteUserClicked(e: EventWithModel<{item: User}>) {
        // Don't navigate to "#!"
        e.preventDefault();

        const selectedUser = e.model.item;

        this.userId = selectedUser.id ?? null;
        this.user = {
            username: selectedUser.username,
            accessLevel: selectedUser.accessLevel,
            password: '',
            repeatPassword: ''
        };
        this.confirmDeleteUserDialog.show();
    }

    protected async deleteUser() {
        try {
            await this.AjaxDelete(`/api/v1/users/${this.userId}`);
            this.showToast('User deleted.');
            await this.refresh();
        } catch (e) {
            this.showToast('Deleting user failed!');
            console.error(e);
        }
    }
}