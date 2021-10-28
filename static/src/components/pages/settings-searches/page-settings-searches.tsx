import { alertController, modalController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { SavedSearchFilter, SavedSearchFilterCompact, SearchFilter } from '../../../generated';
import { usersApi } from '../../../helpers/api';
import { enableBackForOverlay, showToast } from '../../../helpers/utils';
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
    await this.loadSearchFilters();
  }

  render() {
    return (
      <Host>
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
        </ion-content>

        <ion-fab horizontal="end" vertical="bottom" slot="fixed">
          <ion-fab-button color="success" onClick={() => this.onAddFilterClicked()}>
            <ion-icon icon="add" />
          </ion-fab-button>
        </ion-fab>
      </Host>
    );
  }

  private async loadSearchFilters() {
    try {
      this.filters = (await usersApi.usersUserIdFiltersGet(state.currentUser.id.toString())).data ?? [];
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveNewSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      await usersApi.usersUserIdFiltersPost(state.currentUser.id.toString(), searchFilter);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create search filter.');
    }
  }

  private async saveExistingSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      await usersApi.usersUserIdFiltersFilterIdPut(state.currentUser.id.toString(), searchFilter.id, searchFilter);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save search filter.');
    }
  }

  private async deleteSearchFilter(searchFilter: SavedSearchFilterCompact) {
    try {
      await usersApi.usersUserIdFiltersFilterIdDelete(state.currentUser.id.toString(), searchFilter.id);
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
        animated: false,
      });
      await modal.present();

      const resp = await modal.onDidDismiss<{ name: string, searchFilter: SearchFilter }>();
      if (resp.data) {
        await this.saveNewSearchFilter({
          ...resp.data.searchFilter,
          name: resp.data.name,
          userId: state.currentUser.id
        });
        await this.loadSearchFilters();
      }
    });
  }

  private async onEditFilterClicked(searchFilterCompact: SavedSearchFilterCompact) {
    await enableBackForOverlay(async () => {
      const searchFilter = (await usersApi.usersUserIdFiltersFilterIdGet(state.currentUser.id.toString(), searchFilterCompact.id)).data;

      const modal = await modalController.create({
        component: 'search-filter-editor',
        componentProps: {
          prompt: 'Edit Search',
          name: searchFilter.name,
          searchFilter: searchFilter
        },
        animated: false,
      });
      await modal.present();

      const resp = await modal.onDidDismiss<{ name: string, searchFilter: SearchFilter }>();
      if (resp.data) {
        await this.saveExistingSearchFilter({
          ...searchFilter,
          ...resp.data.searchFilter,
          name: resp.data.name
        });
        await this.loadSearchFilters();
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
              await this.deleteSearchFilter(searchFilter);
              await this.loadSearchFilters();
              return true;
            }
          }
        ],
        animated: false,
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

}
