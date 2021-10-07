import { Component, Element, h, State } from '@stencil/core';
import { SavedSearchFilterCompact, UserSettings } from '../../../models';
import { UploadsApi, UsersApi } from '../../../helpers/api';
import { loadingController } from '@ionic/core';

@Component({
  tag: 'page-settings',
  styleUrl: 'page-settings.css'
})
export class PageSettings {
  @State() settings: UserSettings | null;
  @State() filters: SavedSearchFilterCompact[] | null;

  @Element() el!: HTMLPageSettingsElement;
  private settingsForm!: HTMLFormElement;
  private tagsInput!: HTMLIonInputElement | null;
  private imageForm!: HTMLFormElement;
  private imageInput!: HTMLInputElement | null;

  async connectedCallback() {
    await this.loadUserSettings();
    await this.loadSearchFilters();
  }

  render() {
    return (
      <ion-tabs>
        <ion-tab tab="tab-settings-preferences">
          <ion-content>
            <ion-grid class="no-pad" fixed>
              <ion-row>
                <ion-col>
                  <form onSubmit={e => e.preventDefault()} ref={el => this.settingsForm = el}>
                    <ion-card>
                      <ion-card-content>
                        <ion-item>
                          <ion-label position="stacked">Tags</ion-label>
                          {this.settings?.favoriteTags?.length > 0 ?
                            <div class="ion-padding-top">
                              {this.settings?.favoriteTags?.map(tag =>
                                <ion-chip onClick={() => this.removeTag(tag)}>
                                  {tag}
                                  <ion-icon icon="close-circle" />
                                </ion-chip>
                              )}
                            </div>
                            : ''}
                          <ion-input onKeyDown={e => this.onTagsKeyDown(e)} ref={el => this.tagsInput = el} />
                        </ion-item>
                        <ion-item>
                          <ion-label position="stacked">Home Title</ion-label>
                          <ion-input value={this.settings?.homeTitle} onIonChange={e => this.settings = { ...this.settings, homeTitle: e.detail.value }} required />
                        </ion-item>
                        <ion-item lines="full">
                          <form enctype="multipart/form-data" ref={el => this.imageForm = el}>
                            <ion-label position="stacked">Home Image</ion-label>
                            <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="padded-input" ref={el => this.imageInput = el} />
                          </form>
                        </ion-item>
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
        </ion-tab>

        <ion-tab tab="tab-settings-searches">
          <ion-content class="ion-padding">
            Searches
          </ion-content>
        </ion-tab>

        <ion-tab tab="tab-settings-security">
          <ion-content class="ion-padding">
            Security
          </ion-content>
        </ion-tab>

        <ion-tab-bar slot="top">
          <ion-tab-button tab="tab-settings-preferences" href="/settings/preferences">
            <ion-icon name="options" />
            <ion-label>Preferences</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="tab-settings-searches" href="/settings/searches">
            <ion-icon name="search" />
            <ion-label>Searches</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="tab-settings-security" href="/settings/security">
            <ion-icon name="finger-print" />
            <ion-label>Security</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
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
      await UsersApi.putSettings(this.el, null, this.settings);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async loadSearchFilters() {
    try {
      this.filters = await UsersApi.getAllSearchFilters(this.el);
    } catch (ex) {
      console.error(ex);
    }
  }

  private addTag(tag: string) {
    if (!this.settings.favoriteTags) {
      this.settings = {
        ...this.settings,
        favoriteTags: [tag.toLowerCase()]
      };
    } else {
      this.settings = {
        ...this.settings,
        favoriteTags: [
          ...this.settings.favoriteTags,
          tag.toLowerCase()
        ].filter((value, index, self) => self.indexOf(value) === index)
      };
    }
  }

  private removeTag(tag: string) {
    this.settings = {
      ...this.settings,
      favoriteTags: this.settings.favoriteTags.filter(value => value !== tag)
    };
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

      const location = await UploadsApi.post(this.el, new FormData(this.imageForm));
      this.settings = {
        ...this.settings,
        homeImageUrl: location
      }

      // Clear the form
      this.imageInput.value = '';

      await loading.dismiss();
    }

    this.saveUserSettings();
  }

  private onTagsKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.tagsInput.value) {
      this.addTag(this.tagsInput.value.toString());
      this.tagsInput.value = '';
    }
  }
}
