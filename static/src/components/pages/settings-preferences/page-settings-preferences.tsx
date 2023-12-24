import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { UserSettings } from '../../../generated';
import { appApi, getLocationFromResponse, loadUserSettings, usersApi } from '../../../helpers/api';
import { showLoading, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-settings-preferences',
  styleUrl: 'page-settings-preferences.css',
})
export class PageSettingsPreferences {
  @State() settings: UserSettings | null;

  @Element() el!: HTMLPageSettingsPreferencesElement;
  private settingsForm!: HTMLFormElement;
  private imageInput!: HTMLInputElement;

  @Method()
  async activatedCallback() {
    this.settings = await loadUserSettings();
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
                        <ion-input value={this.settings?.homeTitle}
                          autocorrect="on"
                          spellcheck="true"
                          onIonBlur={e => this.settings = { ...this.settings, homeTitle: e.target.value as string }}
                          required />
                      </ion-item>
                      <ion-item lines="full">
                        <form enctype="multipart/form-data">
                          <ion-label position="stacked">Home Image</ion-label>
                          <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" ref={el => this.imageInput = el} />
                        </form>
                        <ion-thumbnail>
                          <img alt="Home Image" src={this.settings?.homeImageUrl} hidden={!this.settings?.homeImageUrl} />
                        </ion-thumbnail>
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
                          <ion-button color="danger" onClick={async () => this.settings = await loadUserSettings()}>Reset</ion-button>
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

  private async saveUserSettings() {
    try {
      await usersApi.saveSettings(this.settings);
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
      await showLoading(
        async () => {
          const resp = await appApi.upload(this.imageInput.files[0]);
          this.settings = {
            ...this.settings,
            homeImageUrl: getLocationFromResponse(resp.headers)
          }
        },
        'Uploading picture...');

      // Clear the form
      this.imageInput.value = '';
    }

    this.saveUserSettings();
  }

}
