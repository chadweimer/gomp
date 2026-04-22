import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { UserSettings } from '../../../generated';
import { appApi, loadUserSettings, usersApi } from '../../../helpers/api';
import { isNull, isNullOrEmpty, showLoading, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-settings-preferences',
  styleUrl: 'page-settings-preferences.css',
})
export class PageSettingsPreferences {
  @State() settings: UserSettings | null = null;

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
                <form onSubmit={e => e.preventDefault()} ref={el => this.settingsForm = el!}>
                  <ion-card>
                    <ion-card-content>
                      <ion-item lines="full">
                        <ion-input label="Home Title" label-placement="stacked" value={this.settings?.homeTitle}
                          autocorrect="on"
                          spellcheck
                          required
                          onIonBlur={(e: Event) => this.settings = { ...this.settings, homeTitle: (e.currentTarget as HTMLIonInputElement).value as string, favoriteTags: this.settings?.favoriteTags ?? [] }} />
                      </ion-item>
                      <ion-item lines="full">
                        <form enctype="multipart/form-data">
                          <ion-label position="stacked">Home Image</ion-label>
                          <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" ref={el => this.imageInput = el!} />
                        </form>
                        <ion-thumbnail>
                          <img alt="Home Image" src={this.settings?.homeImageUrl} hidden={isNullOrEmpty(this.settings?.homeImageUrl)} />
                        </ion-thumbnail>
                      </ion-item>
                      <ion-item lines="full">
                        <tags-input label="Favorite Tags" label-placement="stacked" value={this.settings?.favoriteTags ?? []}
                          onValueChanged={e => this.settings = { ...this.settings, favoriteTags: e.detail }}>
                          <ion-input enterkeyhint="enter" />
                        </tags-input>
                      </ion-item>
                    </ion-card-content>
                    <ion-button fill="clear" color="primary" onClick={() => this.onSaveSettingsClicked()}>
                      <ion-icon slot="start" name="save" />
                      Save
                    </ion-button>
                    <ion-button fill="clear" color="danger" onClick={async () => this.settings = await loadUserSettings()}>
                      <ion-icon slot="start" name="arrow-undo" />
                      Reset
                    </ion-button>
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
    if (isNull(this.settings)) {
      console.error('Cannot save settings: settings are null.');
      return;
    }

    try {
      await usersApi.saveSettings({ settings: this.settings });
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save preferences.');
    }
  }

  private async onSaveSettingsClicked() {
    if (!this.settingsForm.reportValidity()) {
      return;
    }

    if ((this.imageInput?.files?.length ?? 0) > 0) {
      await showLoading(
        async () => {
          const resp = await appApi.uploadRaw({
            fileContent: this.imageInput.files?.[0]
          });
          this.settings = {
            ...this.settings,
            homeImageUrl: resp.raw.headers.get('location') ?? '',
            favoriteTags: this.settings?.favoriteTags ?? []
          }
        },
        'Uploading picture...');

      // Clear the form
      this.imageInput.value = '';
    }

    await this.saveUserSettings();
  }
}
