'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { PaperMenuButton } from '@polymer/paper-menu-button/paper-menu-button.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import { Note } from '../models/models.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@material/mwc-button';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import './confirmation-dialog.js';
import '../common/shared-styles.js';

@customElement('note-card')
export class NoteCard extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    --paper-card: {
                        width: 100%;
                    }
                }
                paper-card:hover {
                    @apply --shadow-elevation-6dp;
                }
                .note-content {
                    margin: 0.75em;
                    white-space: pre-wrap;
                }
                .note-footer {
                    @apply --layout-horizontal;
                    @apply --layout-end-justified;

                    margin-top: 0.5em;
                    color: var(--secondary-text-color);
                    font-size: 0.8em;
                    font-weight: lighter;
                }
                paper-menu-button {
                    position: absolute;
                    top: 0;
                    right: 0;
                }
                #confirmDeleteDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
            </style>

            <paper-card>
                <div class="card-content">
                    <div>
                        <mwc-icon>comment</mwc-icon>
                        <span>[[formatDate(note.createdAt)]]</span>
                        <div hidden\$="[[readonly]]">
                            <paper-menu-button id="noteMenu" horizontal-align="right">
                                <mwc-icon-button icon="more_vert" slot="dropdown-trigger"></mwc-icon-button>
                                <paper-listbox slot="dropdown-content">
                                    <paper-icon-item tabindex="-1" on-click="onEditClicked"><mwc-icon class="amber" slot="item-icon">create</mwc-icon> Edit</paper-icon-item>
                                    <paper-icon-item tabindex="-1" on-click="onDeleteClicked"><mwc-icon class="red" slot="item-icon">delete</mwc-icon> Delete</paper-icon-item>
                                </paper-listbox>
                            </paper-menu-button>
                        </div>
                    </div>
                    <paper-divider></paper-divider>
                    <p class="note-content">[[note.text]]</p>
                    <div hidden\$="[[!showModifiedDate(note)]]">
                        <paper-divider></paper-divider>
                        <div class="note-footer">
                            <span>edited [[formatDate(note.modifiedAt)]]</span>
                        </div>
                    </div>
                </div>
            </paper-card>

            <confirmation-dialog id="confirmDeleteDialog" title="Delete Note?" message="Are you sure you want to delete this note?" on-confirmed="deleteNote"></confirmation-dialog>
`;
    }

    @property({type: Object, notify: true})
    public note: Note = null;

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    private get confirmDeleteDialog(): ConfirmationDialog {
        return this.$.confirmDeleteDialog as ConfirmationDialog;
    }

    protected onEditClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        const el = e.target as HTMLElement;
        const menu = el.closest('#noteMenu') as PaperMenuButton;
        menu.close();

        this.dispatchEvent(new CustomEvent('note-card-edit'));
    }
    protected onDeleteClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        const el = e.target as HTMLElement;
        const menu = el.closest('#noteMenu') as PaperMenuButton;
        menu.close();

        this.confirmDeleteDialog.show();
    }
    protected async deleteNote() {
        try {
            await this.AjaxDelete(`/api/v1/notes/${this.note.id}`);
            this.dispatchEvent(new CustomEvent('note-card-deleted'));
            this.showToast('Note deleted.');
        } catch (e) {
            this.showToast('Deleting note failed!');
            console.error(e);
        }
    }

    protected showModifiedDate(note: Note) {
        if (!note) {
            return false;
        }
        return note.modifiedAt !== note.createdAt;
    }
}
