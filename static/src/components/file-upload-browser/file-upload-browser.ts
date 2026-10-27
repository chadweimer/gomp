import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { getContainingModal } from '../../helpers/modals';
import { globalStyles } from '../../global/shared-styles';

@customElement('file-upload-browser')
export class FileUploadBrowser extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }
    `
  ];

  @property({ type: String }) heading = 'Select File';
  @property({ type: String }) label = 'File';
  @property({ type: String }) accept = '*/*';

  @query('form') private inputForm!: HTMLFormElement;
  @query('input[type="file"]') private fileInput!: HTMLInputElement;

  private parentModal?: HTMLIonModalElement | null;

  connectedCallback() {
    super.connectedCallback();
    this.parentModal = getContainingModal(this);
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons slot="primary">
            <ion-button color="primary" @click=${() => this.onSaveClicked()}>Upload</ion-button>
          </ion-buttons>
          <ion-title>${this.heading}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" @click=${() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-item lines="full">
          <form enctype="multipart/form-data" @submit=${(e: Event) => e.preventDefault()}>
            <ion-label position="stacked">${this.label}</ion-label>
            <input
              name="file_content"
              type="file"
              accept=${this.accept}
              class="ion-padding-vertical"
              required
            />
          </form>
        </ion-item>
      </ion-content>
    `;
  }

  private async onSaveClicked() {
    if (!this.inputForm?.reportValidity()) {
      return;
    }

    const file = (this.fileInput?.files?.length ?? 0) > 0 ? this.fileInput.files![0] : null;
    await this.parentModal?.dismiss({ file }, 'save');
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'file-upload-browser': FileUploadBrowser;
  }
}
