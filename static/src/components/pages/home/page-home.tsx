import { Component, Element, h, Host, Method, Prop, State } from '@stencil/core';
import { AccessLevel, DefaultSearchFilter, Recipe, RecipeCompact, SearchFilter, SortBy, UserSettings } from '../../../models';
import { modalController } from '@ionic/core';
import { RecipesApi, UsersApi } from '../../../helpers/api';
import { hasAccessLevel, redirect, showToast, enableBackForOverlay, showLoading } from '../../../helpers/utils';
import state from '../../../store';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css'
})
export class PageHome {
  @Prop() userSettings: UserSettings | null;

  @State() searches: {
    title: string,
    filter: SearchFilter,
    count: number,
    results: RecipeCompact[]
  }[] = [];

  @Element() el!: HTMLPageHomeElement;

  @Method()
  async activatedCallback() {
    await this.loadUserSettings();
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
                  <h1>{this.userSettings?.homeTitle}</h1>
                  <img alt="Home Image" src={this.userSettings?.homeImageUrl} hidden={!this.userSettings?.homeImageUrl} />
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

  private async loadUserSettings() {
    try {
      this.userSettings = await UsersApi.getSettings(this.el);
    } catch (ex) {
      console.error(ex);
    }
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
        ...(new DefaultSearchFilter()),
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
      const savedFilters = await UsersApi.getAllSearchFilters(this.el);
      if (savedFilters) {
        for (const savedFilter of savedFilters) {
          const savedSearchFilter = await UsersApi.getSearchFilter(this.el, savedFilter.userId, savedFilter.id);
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
    const defaultFilter = new DefaultSearchFilter();
    filter = { ...defaultFilter, ...filter };

    try {
      return await RecipesApi.find(this.el, filter, 1, 6);
    } catch (ex) {
      console.error(ex);
      showToast('An unexpected error occurred attempting to perform the current search.');
    }
  }

  private async saveNewRecipe(recipe: Recipe, formData: FormData) {
    try {
      const newRecipeId = await RecipesApi.post(this.el, recipe);

      if (formData) {
        await showLoading(
          async () => await RecipesApi.postImage(this.el, newRecipeId, formData),
          'Uploading picture...');
      }

      await redirect(`/recipes/${newRecipeId}`);
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

      const resp = await modal.onDidDismiss<{ dismissed: boolean, recipe: Recipe, formData: FormData }>();
      if (resp.data?.dismissed === false) {
        await this.saveNewRecipe(resp.data.recipe, resp.data.formData);
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
