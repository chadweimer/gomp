'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '../shared-styles.js';

@customElement('confirmation-dialog')
export class ConfirmationDialog extends PolymerElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                :host[hidden] {
                    display: none !important;
                }
                h3 {
                    color: var(--confirmation-dialog-title-color, var(--primary-color));
                }
                paper-dialog {
                    width: unset;
                }
            </style>

            <paper-dialog id="dialog" with-backdrop on-iron-overlay-closed="onDialogClosed">
                <h3><iron-icon icon="[[icon]]"></iron-icon> <span>[[title]]</span></h3>
                <p>[[message]]</p>
                <div class="buttons">
                    <paper-button dialog-dismiss>No</paper-button>
                    <paper-button dialog-confirm>Yes</paper-button>
                </div>
            </paper-dialog>
`;
    }

    @property({type: String})
    public icon = 'help';
    @property({type: String})
    public title = 'Are you sure?';
    @property({type: String})
    public message = 'Are you sure you want to perform the requested operation?';

    private get dialog(): PaperDialogElement {
        return this.$.dialog as PaperDialogElement;
    }

    public open() {
        this.dialog.open();
    }

    protected onDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (!e.detail.canceled && e.detail.confirmed) {
            this.dispatchEvent(new CustomEvent('confirmed'));
        } else {
            this.dispatchEvent(new CustomEvent('dismissed'));
        }
    }
}
