import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '../shared-styles.js';
class ConfirmationDialog extends PolymerElement {
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
                    color: var(--confirmation-dialog-title-color, --paper-blue-500);
                }
                h3 > span {
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

    static get is() { return 'confirmation-dialog'; }
    static get properties() {
        return {
            icon: {
                type: String,
                value: 'help',
            },
            title: {
                type: String,
                value: 'Are you sure?',
            },
            message: {
                type: String,
                value: 'Are you sure you want to perform the requested operation?',
            },
        };
    }

    open() {
        this.$.dialog.open();
    }

    _onDialogClosed(e) {
        if (e.detail.canceled) {
            this.dispatchEvent(new CustomEvent('dismissed'));
        } else {
            this.dispatchEvent(new CustomEvent('confirmed'));
        }
    }
}
window.customElements.define(ConfirmationDialog.is, ConfirmationDialog);
