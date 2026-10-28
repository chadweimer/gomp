import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { SavedSearchFilter, SavedSearchFilterCompact, SearchFilter } from '../../../helpers/schema.gen';
import { api } from '../../../helpers/api';
import { showAlert, showModal, showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, isNull, redirect } from '../../../helpers/utils';
import appState from '../../../stores/state';
import '../../page-navigator/page-navigator';
import '../../search-filter-editor/search-filter-editor';
import './page-settings-searches.css';

@customElement('page-settings-searches')
export class PageSettingsSearches extends LitElement implements ComponentWithActivatedCallback {
  private readonly resultsPerPage = 24;

  @state() filters: SavedSearchFilterCompact[] = [];
  @state() page = 1;
  @state() numPages = 1;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activatedCallback().catch(console.error);
  }

  async activatedCallback() {
    await this.loadFilters();
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad">
          <ion-row>
            ${this.filters?.map(filter => html`
              <ion-col key=${filter.id} size="12" size-md="6" size-lg="4" size-xl="3">
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>${filter.name}</ion-card-title>
                  </ion-card-header>
                  <ion-button size="small" fill="clear" @click=${() => this.onLoadSearchClicked(filter.id)}>
                    <ion-icon slot="start" name="open-outline"></ion-icon>
                    Load
                  </ion-button>
                  <ion-button size="small" fill="clear" @click=${() => this.onEditFilterClicked(filter.id)}>
                    <ion-icon slot="start" name="create"></ion-icon>
                    Edit
                  </ion-button>
                  <ion-button size="small" fill="clear" color="danger" @click=${() => this.onDeleteFilterClicked(filter)}>
                    <ion-icon slot="start" name="trash"></ion-icon>
                    Delete
                  </ion-button>
                </ion-card>
              </ion-col>
            `)}
          </ion-row>
        </ion-grid>

        <ion-fab horizontal="end" vertical="bottom" slot="fixed">
          <ion-fab-button color="secondary" @click=${() => this.onAddFilterClicked()}>
            <ion-icon icon="add"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      </ion-content>

      <ion-footer>
        <ion-toolbar color="light">
          <page-navigator
            class="ion-justify-content-center"
            color="secondary"
            .page=${this.page}
            .numPages=${this.numPages}
            @pageChanged=${(e: CustomEvent<number>) => this.setPage(e.detail)}
          ></page-navigator>
        </ion-toolbar>
      </ion-footer>
    `;
  }

  private async loadFilters() {
    try {
      const { data, error } = await api.client.GET('/users/current/filters', {
        params: { query: { page: this.page, count: this.resultsPerPage } }
      });

      if (error) {
        throw new Error('Failed to load search filters.', { cause: error });
      }

      this.filters = data?.filters ?? [];
      this.numPages = Math.max(Math.ceil((data?.total ?? 0) / this.resultsPerPage), 1);
    } catch (ex) {
      this.filters = [];
      this.numPages = 1;
      console.error(ex);
    }
  }

  private setPage(page: number) {
    this.page = page;
    this.loadFilters().catch(console.error);
  }

  private async saveNewSearchFilter(searchFilter: SavedSearchFilter) {
    try {
      const { error } = await api.client.POST('/users/current/filters', {
        body: searchFilter
      });

      if (error) {
        throw new Error('Failed to create search filter.', { cause: error });
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
      const { error } = await api.client.PUT('/users/current/filters/{filterId}', {
        params: { path: { filterId: searchFilter.id } },
        body: searchFilter
      });

      if (error) {
        throw new Error('Failed to save search filter.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save search filter.');
    }
  }

  private async deleteSearchFilter(id: number | null | undefined) {
    if (isNull(id)) {
      return;
    }

    try {
      const { error } = await api.client.DELETE('/users/current/filters/{filterId}', {
        params: { path: { filterId: id } }
      });

      if (error) {
        throw new Error('Failed to delete search filter.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete search filter.');
    }
  }

  private async onAddFilterClicked() {
    const { data } = await showModal<{ name: string, searchFilter: SearchFilter }>({
      presentingElement: this,
      component: 'search-filter-editor',
      componentProps: {
        prompt: 'New Search'
      },
    });
    if (!isNull(data)) {
      await this.saveNewSearchFilter({
        ...data.searchFilter,
        name: data.name
      });
      await this.loadFilters();
    }
  }

  private async onEditFilterClicked(id: number | null | undefined) {
    if (isNull(id)) {
      return;
    }

    const { data: searchFilter, error } = await api.client.GET('/users/current/filters/{filterId}', {
      params: { path: { filterId: id } }
    });

    if (error || !searchFilter) {
      return;
    }

    const { data } = await showModal<{ name: string, searchFilter: SearchFilter }>({
      presentingElement: this,
      component: 'search-filter-editor',
      componentProps: {
        prompt: 'Edit Search',
        name: searchFilter.name,
        searchFilter: searchFilter
      },
    });
    if (!isNull(data)) {
      await this.saveExistingSearchFilter({
        ...searchFilter,
        ...data.searchFilter,
        name: data.name
      });
      await this.loadFilters();
    }
  }

  private async onDeleteFilterClicked(searchFilter: SavedSearchFilterCompact) {
    const { role } = await showAlert({
      header: 'Delete Search Filter?',
      message: `Are you sure you want to delete ${searchFilter.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' }
      ],
    });

    if (role === 'destructive') {
      await this.deleteSearchFilter(searchFilter.id);
      await this.loadFilters();
    }
  }

  private async onLoadSearchClicked(id: number | null | undefined) {
    if (isNull(id)) {
      return;
    }

    try {
      const { data: searchFilter, error } = await api.client.GET('/users/current/filters/{filterId}', {
        params: { path: { filterId: id } }
      });

      if (error) {
        throw new Error('Failed to load search filter.', { cause: error });
      }

      if (searchFilter) {
        appState.searchFilter = searchFilter;
      }
      await redirect('/recipes');
    } catch (ex) {
      console.error(ex);
    }
  }
}

