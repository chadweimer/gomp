import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
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
                h3 {options
                    options-title-color, --paper-blue-500);
                }
                h3 >options
                    padding-left: 0.25em;
                }
            </style>

            <paper-dialog id="dialog" with-backdrop="" on-iron-overlay-closed="_onDialogClosed">
                <h3><iron-icon icon="[[icon]]"></iron-icon> <span>[[title]]</span></h3>
                <p>[[message]]</p>
                <div class="buttons">
                    <paper-button dialog-dismiss="">No</paper-button>
                    <paper-button dialog-confirm="">Yes</paper-button>
                </div>
            </paper-dialog>
`;
    }

    @property({type: String})
    icon = 'help';
    @property({type: String})
    title = 'Are you sure?';
    @property({type: String})
    message = 'Are you sure you want to perform the requested operation?';

    open() {
        let dialog = this.$.dialog as PaperDialogElement;
        dialog.open();
    }

    _onDialogClosed(e: CustomEvent) {
        if (e.detail.canceled) {
            this.dispatchEvent(new CustomEvent('dismissed'));
        } else {
            this.dispatchEvent(new CustomEvent('confirmed'));
        }
    }
}
