import { alertController, modalController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { SavedSearchFilter, SavedSearchFilterCompact, SearchFilter } from '../../../api/schema.gen';
import { apiClient, loadSearchFilters } from '../../../helpers/api';
import { ComponentWithActivatedCallback, enableBackForOverlay, isNull, redirect, showToast } from '../../../helpers/utils';
import state from '../../../stores/state';

@Component({
  tag: 'page-settings-searches',
  styleUrl: 'page-settings-searches.css',
})
export class PageSettingsSearches implements ComponentWithActivatedCallback {
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
      const { error } = await apiClient.POST('/users/current/filters', {
        body: searchFilter
      });

      if (error) {
        throw new Error('Failed to create search filter.');
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to create search filter.');
    }
  }

  private async saveExistingSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      if (isNull(searchFilter.id)) {
        throw new Error('Cannot save search filter: filter ID is null.');
      }
      const { error } = await apiClient.PUT('/users/current/filters/{filterId}', {
        params: { path: { filterId: searchFilter.id } },
        body: searchFilter
      });

      if (error) {
        throw new Error('Failed to save search filter.');
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save search filter.');
    }
  }

  private async deleteSearchFilter(id: number | null | undefined) {
    try {
      if (isNull(id)) {
        return;
      }

      const { error } = await apiClient.DELETE('/users/current/filters/{filterId}', {
        params: { path: { filterId: id } }
      });

      if (error) {
        throw new Error('Failed to delete search filter.');
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete search filter.');
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

  private async onEditFilterClicked(id: number | null | undefined) {
    if (isNull(id)) {
      return;
    }

    await enableBackForOverlay(async () => {
      const { data: searchFilter, error } = await apiClient.GET('/users/current/filters/{filterId}', {
        params: { path: { filterId: id } }
      });

      if (error || !searchFilter) {
        return;
      }

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
        header: 'Delete Search Filter?',
        message: `Are you sure you want to delete ${searchFilter.name}?`,
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.deleteSearchFilter(searchFilter.id);
        this.filters = await loadSearchFilters();
      }
    });
  }

  private async onLoadSearchClicked(id: number | null | undefined) {
    if (isNull(id)) {
      return;
    }

    try {
      const { data: searchFilter, error } = await apiClient.GET('/users/current/filters/{filterId}', {
        params: { path: { filterId: id } }
      });

      if (error || !searchFilter) {
        throw new Error('Failed to load search filter.');
      }

      state.searchFilter = searchFilter;
      await redirect('/recipes');
    } catch (ex) {
      console.error(ex);
    }
  }

}
