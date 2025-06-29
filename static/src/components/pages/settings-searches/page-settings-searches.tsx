import { alertController, modalController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { SavedSearchFilter, SavedSearchFilterCompact, SearchFilter } from '../../../generated';
import { loadSearchFilters, usersApi } from '../../../helpers/api';
import { enableBackForOverlay, isNull, redirect, showToast } from '../../../helpers/utils';
import state from '../../../stores/state';

@Component({
  tag: 'page-settings-searches',
  styleUrl: 'page-settings-searches.css',
})
export class PageSettingsSearches {
  @State() filters: SavedSearchFilterCompact[] = [];

  @Element() el!: HTMLPageSettingsSearchesElement;

  @Method()
  async activatedCallback() {
    this.filters = await loadSearchFilters();
  }

  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad">
            <ion-row>
              {this.filters?.map(filter =>
                <ion-col key={filter.id} size="12" size-md="6" size-lg="4" size-xl="3">
                  <ion-card class="zoom">
                    <ion-card-header>
                      <ion-card-title>{filter.name}</ion-card-title>
                    </ion-card-header>
                    <ion-button size="small" fill="clear" onClick={() => this.onLoadSearchClicked(filter.id)}>
                      <ion-icon slot="start" name="open-outline" />
                      Load
                    </ion-button>
                    <ion-button size="small" fill="clear" onClick={() => this.onEditFilterClicked(filter.id)}>
                      <ion-icon slot="start" name="create" />
                      Edit
                    </ion-button>
                    <ion-button size="small" fill="clear" color="danger" onClick={() => this.onDeleteFilterClicked(filter)}>
                      <ion-icon slot="start" name="trash" />
                      Delete
                    </ion-button>
                  </ion-card>
                </ion-col>
              )}
            </ion-row>
          </ion-grid>
        </ion-content>

        <ion-fab horizontal="end" vertical="bottom" slot="fixed">
          <ion-fab-button color="success" onClick={() => this.onAddFilterClicked()}>
            <ion-icon icon="add" />
          </ion-fab-button>
        </ion-fab>
      </Host>
    );
  }

  private async saveNewSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      await usersApi.addSearchFilter({ searchFilter });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create search filter.');
    }
  }

  private async saveExistingSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      await usersApi.saveSearchFilter({
        filterId: searchFilter.id,
        searchFilter: searchFilter
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save search filter.');
    }
  }

  private async deleteSearchFilter(id: number | null) {
    if (isNull(id)) {
      return;
    }

    try {
      await usersApi.deleteSearchFilter({ filterId: id });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete search filter.');
    }
  }

  private async onAddFilterClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'search-filter-editor',
        componentProps: {
          prompt: 'New Search'
        },
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ name: string, searchFilter: SearchFilter }>();
      if (!isNull(data)) {
        await this.saveNewSearchFilter({
          ...data.searchFilter,
          name: data.name
        });
        this.filters = await loadSearchFilters();
      }
    });
  }

  private async onEditFilterClicked(id: number | null) {
    if (isNull(id)) {
      return;
    }

    await enableBackForOverlay(async () => {
      const searchFilter = await usersApi.getSearchFilter({ filterId: id });

      const modal = await modalController.create({
        component: 'search-filter-editor',
        componentProps: {
          prompt: 'Edit Search',
          name: searchFilter.name,
          searchFilter: searchFilter
        },
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ name: string, searchFilter: SearchFilter }>();
      if (!isNull(data)) {
        await this.saveExistingSearchFilter({
          ...searchFilter,
          ...data.searchFilter,
          name: data.name
        });
        this.filters = await loadSearchFilters();
      }
    });
  }

  private async onDeleteFilterClicked(searchFilter: SavedSearchFilterCompact) {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Delete User?',
        message: `Are you sure you want to delete ${searchFilter.name}?`,
        buttons: [
          'No',
          {
            text: 'Yes',
            handler: async () => {
              await this.deleteSearchFilter(searchFilter.id);
              this.filters = await loadSearchFilters();
              return true;
            }
          }
        ],
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

  private async onLoadSearchClicked(id: number | null) {
    if (isNull(id)) {
      return;
    }

    try {
      state.searchFilter = await usersApi.getSearchFilter({ filterId: id });
      await redirect('/recipes');
    } catch (ex) {
      console.error(ex);
    }
  }

}
