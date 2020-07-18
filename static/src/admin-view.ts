'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { ConfirmationDialog } from './components/confirmation-dialog.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/social-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@cwmr/paper-password-input/paper-password-input.js';
import './components/confirmation-dialog.js';
import './shared-styles.js';

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
                #userDialog h3 > span {
                    padding-left: 0.25em;
                }
                #confirmDeleteUserDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
                paper-password-input {
                    display: block;
                }
                @media screen and (min-width: 993px) {
                    .container {
                        width: 50%;
                        margin: auto;
                    }
                    paper-dialog {
                        width: 33%;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    .container {
                        width: 75%;
                        margin: auto;
                    }
                    paper-dialog {
                        width: 75%;
                    }
                }
                @media screen and (max-width: 600px) {
                    paper-dialog {
                        width: 100%;
                    }
                }
            </style>
            <div class="container">
                <paper-card>
                    <div class="card-content">
                        <h3>Users</h3>

                        <table class="fill">
                            <thead class="left">
                                <tr>
                                    <th>Username</th>
                                    <th>Access Level</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <template is="dom-repeat" items="[[users]]">
                                    <tr>
                                        <td>[[item.username]]</td>
                                        <td>[[item.accessLevel]]</td>
                                        <td class="right">
                                            <a href="#!" tabindex="-1" data-id\$="[[item.id]]" on-click="onEditUserClicked">
                                                <iron-icon class="amber" icon="icons:create" slot="item-icon"></iron-icon>
                                            </a>
                                            <a href="#!" tabindex="-1" data-id\$="[[item.id]]" on-click="onDeleteUserClicked">
                                                <iron-icon class="red" icon="icons:delete" slot="item-icon"></iron-icon>
                                            </a>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                    <div class="card-actions">
                        <paper-button on-click="onAddUserClicked">
                            <iron-icon icon="social:person"></iron-icon>
                            <span>Add</span>
                        <paper-button>
                    </div>
                </paper-card>
            </div>

            <paper-dialog id="addUserDialog" on-iron-overlay-closed="addUserDialogClosed" with-backdrop="">
                <h3><iron-icon icon="social:person"></iron-icon> <span>Add User</span></h3>
                <paper-input label="Username" value="{{user.username}}" always-float-label="" required=""></paper-input>
                <paper-dropdown-menu-light label="Access Level" always-float-label="" required="">
                    <paper-listbox slot="dropdown-content" attr-for-selected="item-name" selected="{{user.accessLevel}}" fallback-selection="editor">
                        <paper-item item-name="admin">admin</paper-item>
                        <paper-item item-name="editor">editor</paper-item>
                        <paper-item item-name="viewer">viewer</paper-item>
                    </paper-listbox>
                </paper-dropdown-menu-light>
                <paper-password-input label="New Password" value="{{user.password}}" always-float-label="" required=""></paper-password-input>
                <paper-password-input label="Confirm Password" value="{{user.repeatPassword}}" always-float-label="" required=""></paper-password-input>
                <div class="buttons">
                    <paper-button dialog-dismiss="">Cancel</paper-button>
                    <paper-button dialog-confirm="">Save</paper-button>
                </div>
            </paper-dialog>

            <paper-dialog id="editUserDialog" on-iron-overlay-closed="editUserDialogClosed" with-backdrop="">
                <h3><iron-icon icon="social:person"></iron-icon> <span>Edit User</span></h3>
                <paper-input label="Username" value="{{user.username}}" always-float-label="" disabled=""></paper-input>
                <paper-dropdown-menu-light label="Access Level" always-float-label="" required="">
                    <paper-listbox slot="dropdown-content" attr-for-selected="item-name" selected="{{user.accessLevel}}" fallback-selection="editor">
                        <paper-item item-name="admin">admin</paper-item>
                        <paper-item item-name="editor">editor</paper-item>
                        <paper-item item-name="viewer">viewer</paper-item>
                    </paper-listbox>
                </paper-dropdown-menu-light>
                <div class="buttons">
                    <paper-button dialog-dismiss="">Cancel</paper-button>
                    <paper-button dialog-confirm="">Save</paper-button>
                </div>
            </paper-dialog>

            <confirmation-dialog id="confirmDeleteUserDialog" icon="icons:delete" title="Delete User?" message="Are you sure you want to delete this user?" on-confirmed="deleteUser"></confirmation-dialog>

            <iron-ajax bubbles="" id="getUsersAjax" url="/api/v1/users" on-response="handleGetUsersResponse"></iron-ajax>
            <iron-ajax bubbles="" id="postUserAjax" url="/api/v1/users" method="POST" on-response="handlePostUserResponse" on-error="handlePostUserError"></iron-ajax>
            <iron-ajax bubbles="" id="putUserAjax" url="/api/v1/users/[[userId]]" method="PUT" on-response="handlePutUserResponse" on-error="handlePutUserError"></iron-ajax>
            <iron-ajax bubbles="" id="deleteUserAjax" url="/api/v1/users/[[userId]]" method="DELETE" on-response="handleDeleteUserResponse" on-error="handleDeleteUserError"></iron-ajax>
`;
    }

    protected users: any[] = [];

    protected userId: number|null = null;
    protected user: {
        username: string,
        accessLevel: string,
        password: string,
        repeatPassword: string
    }|null = null;

    private get addUserDialog(): PaperDialogElement {
        return this.$.addUserDialog as PaperDialogElement;
    }
    private get editUserDialog(): PaperDialogElement {
        return this.$.editUserDialog as PaperDialogElement;
    }
    private get confirmDeleteUserDialog(): ConfirmationDialog {
        return this.$.confirmDeleteUserDialog as ConfirmationDialog;
    }

    private get getUsersAjax(): IronAjaxElement {
        return this.$.getUsersAjax as IronAjaxElement;
    }
    private get postUserAjax(): IronAjaxElement {
        return this.$.postUserAjax as IronAjaxElement;
    }
    private get putUserAjax(): IronAjaxElement {
        return this.$.putUserAjax as IronAjaxElement;
    }
    private get deleteUserAjax(): IronAjaxElement {
        return this.$.deleteUserAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }

    protected refresh() {
        this.getUsersAjax.generateRequest();
    }

    protected handleGetUsersResponse(e: CustomEvent) {
        this.users = e.detail.response;
    }
    protected handlePostUserResponse() {
        this.refresh();
        this.showToast('User created.');
    }
    protected handlePostUserError() {
        this.showToast('Creating user failed!');
    }
    protected handlePutUserResponse() {
        this.refresh();
        this.showToast('User updated.');
    }
    protected handlePutUserError() {
        this.showToast('Updating user failed!');
    }
    protected handleDeleteUserResponse() {
        this.refresh();
        this.showToast('User deleted.');
    }
    protected handleDeleteUserError() {
        this.showToast('Deleting user failed!');
    }

    protected onAddUserClicked() {
        this.userId = null;
        this.user = {
            username: '',
            accessLevel: 'editor',
            password: '',
            repeatPassword: ''
        };
        this.addUserDialog.open();
    }

    protected addUserDialogClosed(e: CustomEvent) {
        if (!e.detail.canceled && e.detail.confirmed) {
            if (this.user.password !== this.user.repeatPassword) {
                this.showToast('Passwords don\'t match.');
                return;
            }

            this.postUserAjax.body = JSON.stringify({
                username: this.user.username,
                accessLevel: this.user.accessLevel,
                password: this.user.password
            }) as any;
            this.postUserAjax.generateRequest();
        }
    }

    protected onEditUserClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        const el = e.currentTarget as HTMLElement;
        this.userId = +el.dataset.id;

        const selectedUser = this.users.find(u => u.id === this.userId);
        if (selectedUser) {
            this.user = {
                username: selectedUser.username,
                accessLevel: selectedUser.accessLevel,
                password: null,
                repeatPassword: null
            };
            this.editUserDialog.open();
        } else {
            this.showToast('Unknown user selected.');
        }
    }

    protected editUserDialogClosed(e: CustomEvent) {
        if (!e.detail.canceled && e.detail.confirmed) {
            this.putUserAjax.body = JSON.stringify({
                id: this.userId,
                username: this.user.username,
                accessLevel: this.user.accessLevel
            }) as any;
            this.putUserAjax.generateRequest();
        }
    }

    protected onDeleteUserClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        const el = e.currentTarget as HTMLElement;
        this.userId = +el.dataset.id;
        this.confirmDeleteUserDialog.open();
    }
    protected deleteUser() {
        this.deleteUserAjax.generateRequest();
    }
}
