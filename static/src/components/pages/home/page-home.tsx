import { Component, Element, Fragment, h, Host, Method, State } from '@stencil/core';
import { getDefaultSearchFilter } from '../../../models';
import { modalController } from '@ionic/core';
import { loadUserSettings, performRecipeSearch, recipesApi, refreshSearchResults, usersApi } from '../../../helpers/api';
import { redirect, showToast, enableBackForOverlay, showLoading, hasScope, isNull, isNullOrEmpty } from '../../../helpers/utils';
import state from '../../../stores/state';
import { AccessLevel, Recipe, RecipeCompact, SearchFilter, SortBy, UserSettings } from '../../../generated';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css'
})
export class PageHome {
  @State() currentUserSettings: UserSettings | null;
  @State() searches: {
    title: string,
    filter: SearchFilter,
    count: number,
    results: RecipeCompact[]
  }[] = [];

  @Element() el!: HTMLPageHomeElement;

  @Method()
  async activatedCallback() {
    this.currentUserSettings = await loadUserSettings();
    await this.loadSearchFilters();
  }

  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad">
            <ion-row>
              <ion-col>
                <header class="ion-text-center">
                  <h1>{this.currentUserSettings?.homeTitle}</h1>
                  <img alt="Home Image" src={this.currentUserSettings?.homeImageUrl} hidden={isNullOrEmpty(this.currentUserSettings?.homeImageUrl)} />
                </header>
              </ion-col>
            </ion-row>
            {this.searches.map(search =>
              <Fragment>
                <ion-row key={search.title}>
                  <ion-col>
                    <ion-item lines="full" button detail onClick={() => this.onFilterClicked(search.filter)}>
                      <ion-label>{search.title}</ion-label>
                      <ion-label slot="end">{search.count}</ion-label>
                    </ion-item>
                  </ion-col>
                </ion-row>
                <ion-row key={`${search.title}-list`}>
                  {search.results.map(recipe =>
                    <ion-col key={recipe.id} size="6" size-md="4" size-lg="4" size-xl="2">
                      <recipe-card recipe={recipe} size="small" />
                    </ion-col>
                  )}
                </ion-row>
              </Fragment>
            )}
          </ion-grid>
        </ion-content>

        {hasScope(state.jwtToken, AccessLevel.Editor) &&
          <ion-fab horizontal="end" vertical="bottom" slot="fixed">
            <ion-fab-button color="success" onClick={() => this.onNewRecipeClicked()}>
              <ion-icon icon="add" />
            </ion-fab-button>
          </ion-fab>
        }
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
      const savedFilters = await usersApi.getSearchFilters();
      for (const savedFilter of savedFilters ?? []) {
        const savedSearchFilter = await usersApi.getSearchFilter({ filterId: savedFilter.id });
        const { total, recipes } = await this.performSearch(savedSearchFilter);
        searches.push({
          title: savedSearchFilter.name,
          filter: savedSearchFilter,
          count: total,
          results: recipes ?? []
        });
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
      const resp = await performRecipeSearch(filter, 1, 6);
      return resp;
    } catch (ex) {
      console.error(ex);
      showToast('An unexpected error occurred attempting to perform the current search.');
    }
  }

  private async saveNewRecipe(recipe: Recipe, file: File | null) {
    try {
      const newRecipe = await recipesApi.addRecipe({ recipe });

      if (!isNull(file)) {
        await showLoading(
          async () => {
            await recipesApi.uploadImage({
              recipeId: newRecipe.id,
              fileContent: file
            });
          },
          'Uploading picture...');
      }

      // Update the search results since the new recipe may be in them
      await refreshSearchResults();

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
        backdropDismiss: false,
      });

      await modal.present();

      const { data } = await modal.onDidDismiss<{ recipe: Recipe, file: File | null }>();
      if (!isNull(data)) {
        await this.saveNewRecipe(data.recipe, data.file);
      }
    });
  }

  private async onFilterClicked(filter: SearchFilter) {
    state.searchFilter = {
      ...filter
    };
    await redirect('/recipes');
  }

}
