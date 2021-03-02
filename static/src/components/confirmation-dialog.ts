import { Dialog } from '@material/mwc-dialog';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '../common/shared-styles.js';

@customElement('confirmation-dialog')
export class ConfirmationDialog extends PolymerElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    --mdc-dialog-heading-ink-color: var(--confirmation-dialog-title-color);
                }
                :host[hidden] {
                    display: none !important;
                }
                mwc-dialog {
                    --mdc-dialog-min-width: unset;
                }
            </style>

            <mwc-dialog id="dialog" heading="[[title]]" on-closed="onDialogClosed">
                <p>[[message]]</p>
                <mwc-button label="Yes" slot="primaryAction" dialogAction="yes"></mwc-button>
                <mwc-button label="No" slot="secondaryAction" dialogAction="cancel" dialogInitialFocus></mwc-button>
            </mwc-dialog>
`;
    }

    @property({type: String})
    public title = 'Are you sure?';
    @property({type: String})
    public message = 'Are you sure you want to perform the requested operation?';

    private get dialog() {
        return this.$.dialog as Dialog;
    }

    public show() {
        this.dialog.show();
    }

    protected onDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action === 'yes') {
            this.dispatchEvent(new CustomEvent('confirmed'));
        } else {
            this.dispatchEvent(new CustomEvent('dismissed'));
        }
    }
}
