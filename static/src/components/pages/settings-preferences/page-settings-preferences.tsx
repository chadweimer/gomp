import { loadingController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { UploadsApi, UsersApi } from '../../../helpers/api';
import { showToast } from '../../../helpers/utils';
import { UserSettings } from '../../../models';
import state from '../../../store';

@Component({
  tag: 'page-settings-preferences',
  styleUrl: 'page-settings-preferences.css',
})
export class PageSettingsPreferences {
  @State() settings: UserSettings | null;

  @Element() el!: HTMLPageSettingsPreferencesElement;
  private settingsForm!: HTMLFormElement;
  private imageForm!: HTMLFormElement;
  private imageInput!: HTMLInputElement | null;

  @Method()
  async activatedCallback() {
    await this.loadUserSettings();
  }

  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad" fixed>
            <ion-row>
              <ion-col>
                <form onSubmit={e => e.preventDefault()} ref={el => this.settingsForm = el}>
                  <ion-card>
                    <ion-card-content>
                      <ion-item>
                        <ion-label position="stacked">Home Title</ion-label>
                        <ion-input value={this.settings?.homeTitle} onIonChange={e => this.settings = { ...this.settings, homeTitle: e.detail.value }} required />
                      </ion-item>
                      <ion-item lines="full">
                        <form enctype="multipart/form-data" ref={el => this.imageForm = el}>
                          <ion-label position="stacked">Home Image</ion-label>
                          <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" ref={el => this.imageInput = el} />
                        </form>
                      </ion-item>
                      <tags-input label="Favorite Tags" value={this.settings?.favoriteTags ?? []}
                        onValueChanged={e => this.settings = { ...this.settings, favoriteTags: e.detail }} />
                    </ion-card-content>
                    <ion-footer>
                      <ion-toolbar>
                        <ion-buttons slot="primary">
                          <ion-button color="primary" onClick={() => this.onSaveSettingsClicked()}>Save</ion-button>
                        </ion-buttons>
                        <ion-buttons slot="secondary">
                          <ion-button color="danger" onClick={() => this.loadUserSettings()}>Reset</ion-button>
                        </ion-buttons>
                      </ion-toolbar>
                    </ion-footer>
                  </ion-card>
                </form>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
  }

  private async loadUserSettings() {
    try {
      this.settings = await UsersApi.getSettings(this.el);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveUserSettings() {
    try {
      await UsersApi.putSettings(this.el, state.currentUser.id, this.settings);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save preferences.');
    }
  }

  private async onSaveSettingsClicked() {
    if (!this.settingsForm.reportValidity()) {
      return;
    }

    if (this.imageInput.value) {
      const loading = await loadingController.create({
        message: 'Uploading image...',
        animated: false,
      });
      await loading.present();
      try {
        const location = await UploadsApi.post(this.el, new FormData(this.imageForm));
        this.settings = {
          ...this.settings,
          homeImageUrl: location
        }
      } finally {
        await loading.dismiss();
      }

      // Clear the form
      this.imageInput.value = '';
    }

    this.saveUserSettings();
  }

}
