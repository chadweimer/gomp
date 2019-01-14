import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-styles/color.js';
import '../shared-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class ConfirmationDialog extends GestureEventListeners(PolymerElement) {
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

            <paper-dialog id="dialog" with-backdrop="">
                <h3><iron-icon icon="[[icon]]"></iron-icon> <span>[[title]]</span></h3>
                <p>[[message]]</p>
                <div class="buttons">
                    <paper-button on-tap="_onDismissButtonTapped" dialog-dismiss="">No</paper-button>
                    <paper-button on-tap="_onConfirmButtonTapped" dialog-confirm="">Yes</paper-button>
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

    _onDismissButtonTapped(e) {
        e.preventDefault();

        this.dispatchEvent(new CustomEvent('dismissed'));
    }
    _onConfirmButtonTapped(e) {
        e.preventDefault();

        this.dispatchEvent(new CustomEvent('confirmed'));
    }
}
window.customElements.define(ConfirmationDialog.is, ConfirmationDialog);
