import { Component, Element, Host, Prop, h } from '@stencil/core';
import { configureModalAutofocus, dismissContainingModal } from '../../helpers/utils';

@Component({
  tag: 'file-upload-browser',
  styleUrl: 'file-upload-browser.css',
  shadow: true,
})
export class FileUploadBrowser {
  @Prop() heading: string = 'Select File';
  @Prop() label: string = 'File';
  @Prop() accept: string = '*/*';

  @Element() el!: HTMLFileUploadBrowserElement;

  private inputForm!: HTMLFormElement;
  private fileInput!: HTMLInputElement;

  connectedCallback() {
    configureModalAutofocus(this.el);
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Upload</ion-button>
            </ion-buttons>
            <ion-title>{this.heading}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-item lines="full">
            <form enctype="multipart/form-data" ref={el => this.inputForm = el!}>
              <ion-label position="stacked">{this.label}</ion-label>
              <input name="file_content" type="file" accept={this.accept} class="ion-padding-vertical" ref={el => this.fileInput = el!} required />
            </form>
          </ion-item>
        </ion-content>
      </Host>
    );
  }

  private async onSaveClicked() {
    if (!this.inputForm.reportValidity()) {
      return;
    }

    await dismissContainingModal(this.el, {
      file: (this.fileInput?.files?.length ?? 0) > 0 ? this.fileInput.files?.[0] : null
    });
  }

  private async onCancelClicked() {
    await dismissContainingModal(this.el);
  }

}
