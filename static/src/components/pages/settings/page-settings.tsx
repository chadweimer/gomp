import { Component, Element, h, Method, State } from '@stencil/core';
import { SavedSearchFilter, SavedSearchFilterCompact, SearchFilter, UserSettings } from '../../../models';
import { UploadsApi, UsersApi } from '../../../helpers/api';
import { alertController, loadingController, modalController } from '@ionic/core';
import state from '../../../store';
import { capitalizeFirstLetter, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-settings',
  styleUrl: 'page-settings.css'
})
export class PageSettings {
  @State() settings: UserSettings | null;
  @State() filters: SavedSearchFilterCompact[] | null;
  @State() currentPassword = '';
  @State() newPassword = '';
  @State() repeatPassword = '';

  @Element() el!: HTMLPageSettingsElement;
  private settingsForm!: HTMLFormElement;
  private imageForm!: HTMLFormElement;
  private imageInput!: HTMLInputElement | null;
  private securityForm!: HTMLFormElement;
  private repeatPasswordInput!: HTMLIonInputElement;

  @Method()
  async activatedCallback() {
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
                          <ion-label position="stacked">Home Title</ion-label>
                          <ion-input value={this.settings?.homeTitle} onIonChange={e => this.settings = { ...this.settings, homeTitle: e.detail.value }} required />
                        </ion-item>
                        <ion-item lines="full">
                          <form enctype="multipart/form-data" ref={el => this.imageForm = el}>
                            <ion-label position="stacked">Home Image</ion-label>
                            <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="padded-input" ref={el => this.imageInput = el} />
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
        </ion-tab>

        <ion-tab tab="tab-settings-searches">
          <ion-content>
            <ion-grid class="no-pad">
              <ion-row>
                {this.filters?.map(filter =>
                  <ion-col size="12" size-md="6" size-lg="4" size-xl="3">
                    <ion-card>
                      <ion-card-content>
                        <ion-item lines="none">
                          <ion-label>
                            <h2>{filter.name}</h2>
                          </ion-label>
                          <ion-buttons>
                            <ion-button slot="end" fill="clear" color="warning" onClick={() => this.onEditFilterClicked(filter)}><ion-icon name="create" /></ion-button>
                            <ion-button slot="end" fill="clear" color="danger" onClick={() => this.onDeleteFilterClicked(filter)}><ion-icon name="trash" /></ion-button>
                          </ion-buttons>
                        </ion-item>
                      </ion-card-content>
                    </ion-card>
                  </ion-col>
                )}
              </ion-row>
            </ion-grid>
            <ion-fab horizontal="end" vertical="bottom" slot="fixed">
              <ion-fab-button color="success" onClick={() => this.onAddFilterClicked()}>
                <ion-icon icon="add" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-tab>

        <ion-tab tab="tab-settings-security">
          <ion-content>
            <ion-grid class="no-pad" fixed>
              <ion-row>
                <ion-col>
                  <form onSubmit={e => e.preventDefault()} ref={el => this.securityForm = el}>
                    <ion-card>
                      <ion-card-content>
                        <ion-item>
                          <ion-label position="stacked">Email</ion-label>
                          <ion-input type="email" value={state.currentUser.username} disabled />
                        </ion-item>
                        <ion-item>
                          <ion-label position="stacked">Access Level</ion-label>
                          <ion-input value={capitalizeFirstLetter(state.currentUser.accessLevel)} disabled />
                        </ion-item>
                        <ion-item>
                          <ion-label position="stacked">Current Password</ion-label>
                          <ion-input type="password" value={this.currentPassword} onIonChange={e => this.currentPassword = e.detail.value} required />
                        </ion-item>
                        <ion-item>
                          <ion-label position="stacked">New Password</ion-label>
                          <ion-input type="password" value={this.newPassword} onIonChange={e => this.newPassword = e.detail.value} required />
                        </ion-item>
                        <ion-item>
                          <ion-label position="stacked">Confirm Password</ion-label>
                          <ion-input type="password" value={this.repeatPassword} onIonChange={e => this.repeatPassword = e.detail.value} ref={el => this.repeatPasswordInput = el} required />
                        </ion-item>
                      </ion-card-content>
                      <ion-footer>
                        <ion-toolbar>
                          <ion-buttons slot="primary">
                            <ion-button color="primary" onClick={() => this.onUpdatePasswordClicked()}>Update Password</ion-button>
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
      await UsersApi.putSettings(this.el, state.currentUser.id, this.settings);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save preferences.');
    }
  }

  private async loadSearchFilters() {
    try {
      this.filters = await UsersApi.getAllSearchFilters(this.el);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveNewSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      await UsersApi.postSearchFilter(this.el, state.currentUser.id, searchFilter);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create search filter.');
    }
  }

  private async saveExistingSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      await UsersApi.putSearchFilter(this.el, state.currentUser.id, searchFilter);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save search filter.');
    }
  }

  private async deleteSearchFilter(searchFilter: SavedSearchFilterCompact) {
    try {
      await UsersApi.deleteSearchFilter(this.el, state.currentUser.id, searchFilter.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete search filter.');
    }
  }

  private async updateUserPassword(currentPassword: string, newPassword: string) {
    try {
      await UsersApi.putPassword(this.el, state.currentUser.id, currentPassword, newPassword);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to update password.');
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

  private async onAddFilterClicked() {
    window.history.pushState({ modal: true }, '');

    const modal = await modalController.create({
      component: 'search-filter-editor',
      componentProps: {
        prompt: 'New Search'
      },
      animated: false,
    });
    await modal.present();

    const resp = await modal.onDidDismiss<{ dismissed: boolean, name: string, searchFilter: SearchFilter }>();
    if (resp.data?.dismissed === false) {
      await this.saveNewSearchFilter({
        ...resp.data.searchFilter,
        name: resp.data.name,
        userId: state.currentUser.id
      });
      await this.loadSearchFilters();
    }
  }

  private async onEditFilterClicked(searchFilterCompact: SavedSearchFilterCompact | null) {
    window.history.pushState({ modal: true }, '');

    const searchFilter = await UsersApi.getSearchFilter(this.el, state.currentUser.id, searchFilterCompact.id);

    const modal = await modalController.create({
      component: 'search-filter-editor',
      componentProps: {
        prompt: 'Edit Search'
      },
      animated: false,
    });
    await modal.present();

    // Workaround for auto-grow textboxes in a dialog.
    // Set this only after the dialog has presented,
    // instead of using component props
    const editor = modal.querySelector('search-filter-editor');
    editor.searchFilter = searchFilter;
    editor.name = searchFilter.name;

    const resp = await modal.onDidDismiss<{ dismissed: boolean, name: string, searchFilter: SearchFilter }>();
    if (resp.data?.dismissed === false) {
      await this.saveExistingSearchFilter({
        ...searchFilter,
        ...resp.data.searchFilter,
        name: resp.data.name
      });
      await this.loadSearchFilters();
    }
  }

  private async onDeleteFilterClicked(searchFilter: SavedSearchFilterCompact) {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Delete User?',
      message: `Are you sure you want to delete ${searchFilter.name}?`,
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.deleteSearchFilter(searchFilter);
            await this.loadSearchFilters();
            return true;
          }
        }
      ],
      animated: false,
    });

    await confirmation.present();
  }

  private async onUpdatePasswordClicked() {
    const native = await this.repeatPasswordInput.getInputElement();
    if (this.newPassword !== this.repeatPassword) {
      native.setCustomValidity('Passwords must match');
    } else {
      native.setCustomValidity('');
    }

    if (!this.securityForm.reportValidity()) {
      return;
    }

    await this.updateUserPassword(this.currentPassword, this.newPassword);

    this.currentPassword = '';
    this.newPassword = '';
    this.repeatPassword = '';
  }
}
