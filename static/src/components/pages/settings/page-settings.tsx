import { Component, Element, h, State } from '@stencil/core';
import { SavedSearchFilterCompact, UserSettings } from '../../../models';
import { ajaxGet } from '../../../helpers/ajax';

@Component({
  tag: 'page-settings',
  styleUrl: 'page-settings.css'
})
export class PageSettings {
  @State() settings: UserSettings | null;
  @State() filters: SavedSearchFilterCompact[] | null;

  @Element() el: HTMLPageSettingsElement;

  async connectedCallback() {
    await this.loadUserSettings();
  }

  render() {
    return (
      <ion-tabs>
        <ion-tab tab="tab-settings-preferences">
          <ion-content class="ion-padding">
            Preferences
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
      this.settings = await ajaxGet(this.el, '/api/v1/users/current/settings');
      this.filters = await ajaxGet(this.el, '/api/v1/users/current/filters');
    } catch (ex) {
      console.error(ex);
    }
  }
}
