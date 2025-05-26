import { Component, Element, Host, h } from '@stencil/core';
import { configureModalAutofocus, dismissContainingModal } from '../../helpers/utils';

@Component({
  tag: 'image-upload-browser',
  styleUrl: 'image-upload-browser.css',
  shadow: true,
})
export class ImageUploadBrowser {
  @Element() el!: HTMLImageUploadBrowserElement;
  private imageForm!: HTMLFormElement;
  private imageInput!: HTMLInputElement;

  connectedCallback() {
    configureModalAutofocus(this.el);
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>Upload Picture</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-item lines="full">
            <form enctype="multipart/form-data" ref={el => this.imageForm = el}>
              <ion-label position="stacked">Picture</ion-label>
              <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" ref={el => this.imageInput = el} required />
            </form>
          </ion-item>
        </ion-content>
      </Host>
    );
  }

  private async onSaveClicked() {
    if (!this.imageForm.reportValidity()) {
      return;
    }

    dismissContainingModal(this.el, {
      file: this.imageInput?.files.length > 0 ? this.imageInput.files[0] : null
    });
  }

  private onCancelClicked() {
    dismissContainingModal(this.el);
  }

}
