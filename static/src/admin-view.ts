'use strict';
import { Dialog } from '@material/mwc-dialog';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { User, EventWithModel, AppConfiguration } from './models/models.js';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@cwmr/paper-password-input/paper-password-input.js';
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
                    --paper-tabs-selection-bar-color: var(--accent-color);
                }
                #confirmDeleteUserDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
                paper-password-input {
                    display: block;
                }
            </style>
            <div class="container padded-10">
                <paper-tabs selected="{{selectedTab}}">
                    <paper-tab>Configuration</paper-tab>
                    <paper-tab>Users</paper-tab>
                </paper-tabs>

                <iron-pages selected="[[selectedTab]]">
                    <paper-card>
                        <div class="card-content">
                            <paper-input label="Application Title" value="{{appConfig.title}}" always-float-label></paper-input>
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

            <mwc-dialog id="addUserDialog" heading="Add User" on-closed="addUserDialogClosed">
                <div>
                    <paper-input label="Email" value="{{user.username}}" type="email" always-float-label required></paper-input>
                    <paper-dropdown-menu-light label="Access Level" always-float-label required>
                        <paper-listbox slot="dropdown-content" attr-for-selected="item-name" selected="{{user.accessLevel}}" fallback-selection="editor">
                            <paper-item item-name="admin">admin</paper-item>
                            <paper-item item-name="editor">editor</paper-item>
                            <paper-item item-name="viewer">viewer</paper-item>
                        </paper-listbox>
                    </paper-dropdown-menu-light>
                    <paper-password-input label="New Password" value="{{user.password}}" always-float-label required></paper-password-input>
                    <paper-password-input label="Confirm Password" value="{{user.repeatPassword}}" always-float-label required></paper-password-input>
                </div>
                <mwc-button slot="primaryAction" label="Save" dialogAction="save"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>

            <mwc-dialog id="editUserDialog" heading="Edit User" on-closed="editUserDialogClosed">
                <div>
                    <paper-input label="Email" value="{{user.username}}" type="email" always-float-label disabled></paper-input>
                    <paper-dropdown-menu-light label="Access Level" always-float-label required>
                        <paper-listbox slot="dropdown-content" attr-for-selected="item-name" selected="{{user.accessLevel}}" fallback-selection="editor">
                            <paper-item item-name="admin">admin</paper-item>
                            <paper-item item-name="editor">editor</paper-item>
                            <paper-item item-name="viewer">viewer</paper-item>
                        </paper-listbox>
                    </paper-dropdown-menu-light>
                </div>
                <mwc-button slot="primaryAction" label="Save" dialogAction="save"></mwc-button>
                <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
            </mwc-dialog>

            <confirmation-dialog id="confirmDeleteUserDialog" title="Delete User?" message="Are you sure you want to delete '[[user.username]]'?" on-confirmed="deleteUser"></confirmation-dialog>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User = null;

    protected appConfig: AppConfiguration = null;

    protected users: User[] = [];

    protected userId: number|null = null;
    protected user: {
        username: string,
        accessLevel: string,
        password: string,
        repeatPassword: string
    }|null = null;

    private get addUserDialog(): Dialog {
        return this.$.addUserDialog as Dialog;
    }
    private get editUserDialog(): Dialog {
        return this.$.editUserDialog as Dialog;
    }
    private get confirmDeleteUserDialog(): ConfirmationDialog {
        return this.$.confirmDeleteUserDialog as ConfirmationDialog;
    }

    public ready() {
        super.ready();

        this.set('selectedTab', 0);

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

    protected async onSaveAppConfigClicked() {
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
            accessLevel: 'editor',
            password: '',
            repeatPassword: ''
        };
        this.addUserDialog.show();
    }

    protected async addUserDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action !== 'save') {
            return;
        }

        if (this.user.password !== this.user.repeatPassword) {
            this.showToast('Passwords don\'t match.');
            return;
        }

        const userDetails = {
            username: this.user.username,
            accessLevel: this.user.accessLevel,
            password: this.user.password
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

        this.userId = selectedUser.id;
        this.user = {
            username: selectedUser.username,
            accessLevel: selectedUser.accessLevel,
            password: null,
            repeatPassword: null
        };
        this.editUserDialog.show();
    }

    protected async editUserDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action !== 'save') {
            return;
        }

        const userDetails = {
            id: this.userId,
            username: this.user.username,
            accessLevel: this.user.accessLevel
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

        this.userId = selectedUser.id;
        this.user = {
            username: selectedUser.username,
            accessLevel: selectedUser.accessLevel,
            password: null,
            repeatPassword: null
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
