import { Component, Element, h, Host, Method, State } from '@stencil/core';
import { getDefaultSearchFilter } from '../../../models';
import { modalController } from '@ionic/core';
import { recipesApi, usersApi } from '../../../helpers/api';
import { hasAccessLevel, redirect, showToast, enableBackForOverlay, showLoading, toYesNoAny } from '../../../helpers/utils';
import state from '../../../stores/state';
import { AccessLevel, Recipe, RecipeCompact, SearchFilter, SortBy } from '../../../generated';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css'
})
export class PageHome {
  @State() searches: {
    title: string,
    filter: SearchFilter,
    count: number,
    results: RecipeCompact[]
  }[] = [];

  @Element() el!: HTMLPageHomeElement;

  @Method()
  async activatedCallback() {
    await this.loadSearchFilters();
  }

  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid fixed>
            <ion-row>
              <ion-col>
                <header class="ion-text-center">
                  <h1>{state.currentUserSettings?.homeTitle}</h1>
                  <img alt="Home Image" src={state.currentUserSettings?.homeImageUrl} hidden={!state.currentUserSettings?.homeImageUrl} />
                </header>
              </ion-col>
            </ion-row>
          </ion-grid>
          {this.searches.map(search =>
            <div>
              <ion-grid class="no-pad">
                <ion-row>
                  <ion-col>
                    <ion-item lines="full" button detail onClick={() => this.onFilterClicked(search.filter)}>
                      <ion-label>{search.title}</ion-label>
                      <ion-badge slot="end" color="secondary">{search.count}</ion-badge>
                    </ion-item>
                  </ion-col>
                </ion-row>
                <ion-row>
                  {search.results.map(recipe =>
                    <ion-col size="6" size-md="4" size-xl="2">
                      <recipe-card recipe={recipe} size="small" />
                    </ion-col>
                  )}
                </ion-row>
              </ion-grid>
            </div>
          )}
        </ion-content>

        {hasAccessLevel(state.currentUser, AccessLevel.Editor) ?
          <ion-fab horizontal="end" vertical="bottom" slot="fixed">
            <ion-fab-button color="success" onClick={() => this.onNewRecipeClicked()}>
              <ion-icon icon="add" />
            </ion-fab-button>
          </ion-fab>
          : ''}
      </Host>
    );
  }

  private async loadSearchFilters() {
    try {
      const searches: {
        title: string,
        filter: SearchFilter,
        count: number,
        results: RecipeCompact[]
      }[] = [];

      // First add the "all" search
      const allFilter: SearchFilter = {
        ...(getDefaultSearchFilter()),
        sortBy: SortBy.Random
      };
      const { total, recipes } = await this.performSearch(allFilter);
      searches.push({
        title: 'Recipes',
        filter: allFilter,
        count: total,
        results: recipes ?? []
      });

      // Then load all the user's saved filters
      const savedFilters = (await usersApi.getSearchFilters(state.currentUser.id)).data ?? [];
      if (savedFilters) {
        for (const savedFilter of savedFilters) {
          const savedSearchFilter = (await usersApi.getSearchFilter(savedFilter.userId, savedFilter.id)).data;
          const { total, recipes } = await this.performSearch(savedSearchFilter);
          searches.push({
            title: savedSearchFilter.name,
            filter: savedSearchFilter,
            count: total,
            results: recipes ?? []
          });
        }
      }

      this.searches = searches;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async performSearch(filter: SearchFilter) {
    // Make sure to fill in any missing fields
    const defaultFilter = getDefaultSearchFilter();
    filter = { ...defaultFilter, ...filter };

    try {
      return (await recipesApi.find(filter.sortBy, filter.sortDir, 1, 6, filter.query, toYesNoAny(filter.withPictures), filter.fields, filter.states, filter.tags)).data;
    } catch (ex) {
      console.error(ex);
      showToast('An unexpected error occurred attempting to perform the current search.');
    }
  }

  private async saveNewRecipe(recipe: Recipe, file: File) {
    try {
      const newRecipe = (await recipesApi.addRecipe(recipe)).data;

      if (file) {
        await showLoading(
          async () => {
            await recipesApi.uploadImage(newRecipe.id, file);
          },
          'Uploading picture...');
      }

      await redirect(`/recipes/${newRecipe.id}`);
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to create new recipe.');
    }
  }

  private async onNewRecipeClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'recipe-editor',
        animated: false,
      });

      await modal.present();

      const resp = await modal.onDidDismiss<{ recipe: Recipe, file: File }>();
      if (resp.data) {
        await this.saveNewRecipe(resp.data.recipe, resp.data.file);
      }
    });
  }

  private async onFilterClicked(filter: SearchFilter) {
    state.searchFilter = {
      ...filter
    };
    state.searchPage = 1;
    await redirect('/search');
  }

}
