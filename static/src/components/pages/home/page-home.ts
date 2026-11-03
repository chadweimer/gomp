import { LitElement, html, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { getDefaultSearchFilter } from '../../../models';
import { api, fileContentSerializer } from '../../../helpers/api';
import { showToast, showLoading, showModal } from '../../../helpers/modals';
import { redirect, isNull, isNullOrEmpty, ComponentWithActivatedCallback, isAuthorized, trap } from '../../../helpers/utils';
import { AccessLevel, Recipe, RecipeCompact, SearchFilter, SortBy, UserSettings } from '../../../helpers/schema.gen';
import { searchContext, SearchContextValue, userContext, UserContextValue } from '../../../context';

import '../../recipe-card/recipe-card';
import '../../recipe-editor/recipe-editor';
import '../../app-icon/app-icon';
import './page-home.css';

@customElement('page-home')
export class PageHome extends LitElement implements ComponentWithActivatedCallback {
  @consume({ context: userContext, subscribe: true })
  @property({ attribute: false })
  userCtx?: UserContextValue;

  @consume({ context: searchContext, subscribe: false })
  @property({ attribute: false })
  searchCtx?: SearchContextValue;

  @state() private currentUserSettings: UserSettings | null = null;
  @state() private searches: {
    title: string;
    filter: SearchFilter;
    count: number;
    results: RecipeCompact[];
  }[] = [];

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.loadData().catch(console.error);
  }

  async activatedCallback() {
    await this.loadData();
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad">
          <ion-row>
            <ion-col>
              <header class="ion-text-center">
                <h1>${this.currentUserSettings?.homeTitle}</h1>
                <img
                  alt="Home"
                  src=${this.currentUserSettings?.homeImageUrl ?? ''}
                  ?hidden=${isNullOrEmpty(this.currentUserSettings?.homeImageUrl)}
                />
              </header>
            </ion-col>
          </ion-row>
          ${this.searches?.map(search => html`
            <ion-row key=${search.title}>
              <ion-col>
                <ion-item lines="full" button detail @click=${() => this.onFilterClicked(search.filter)}>
                  <ion-label>${search.title}</ion-label>
                  <ion-label slot="end">${search.count}</ion-label>
                </ion-item>
              </ion-col>
            </ion-row>
            <ion-row key="${search.title}-list">
              ${search.results.map(recipe => html`
                <ion-col key=${recipe.id ?? ''} size="6" size-md="4" size-lg="4" size-xl="2">
                  <recipe-card .recipe=${recipe} class="zoom"></recipe-card>
                </ion-col>
              `)}
            </ion-row>
          `)}
        </ion-grid>
      </ion-content>

      ${isAuthorized(this.userCtx?.user, AccessLevel.Editor) ? html`
        <ion-fab horizontal="end" vertical="bottom" slot="fixed">
          <ion-fab-button color="secondary" @click=${() => this.onNewRecipeClicked()}>
            <app-icon name="add"></app-icon>
          </ion-fab-button>
        </ion-fab>
      ` : nothing}
    `;
  }

  private async loadData() {
    this.currentUserSettings = await trap(api.loadUserSettings, null);
    await this.loadSearchFilters();
  }

  private async loadSearchFilters() {
    try {
      const searches: {
        title: string;
        filter: SearchFilter;
        count: number;
        results: RecipeCompact[];
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

      // Then load the first 10 of the user's saved filters
      const savedFilters = await api.loadSearchFilters(1, 10);
      const results = await Promise.all(savedFilters.map(async savedFilter => {
        if (isNull(savedFilter.id)) return null;
        const { data: savedSearchFilter, error } = await api.client.GET('/users/current/filters/{filterId}', {
          params: { path: { filterId: savedFilter.id } }
        });

        if (error != null) {
          throw new Error('Failed to load saved search filter.', { cause: error });
        }

        if (savedSearchFilter == null) {
          return null;
        }

        const { total: filterTotal, recipes: filterRecipes } = await this.performSearch(savedSearchFilter);
        return {
          title: savedSearchFilter.name,
          filter: savedSearchFilter,
          count: filterTotal,
          results: filterRecipes ?? []
        };
      }));
      searches.push(...results.filter(r => r != null));

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
      const resp = await api.performRecipeSearch(filter, 1, 6);
      return resp;
    } catch (ex) {
      console.error(ex);
      await showToast('An unexpected error occurred attempting to perform the current search.');
      return { total: 0, recipes: [] };
    }
  }

  private async saveNewRecipe(recipe: Recipe, file: File | null) {
    try {
      const { data: newRecipe, error } = await api.client.POST('/recipes', {
        body: recipe
      });

      if (error != null) {
        throw new Error('Failed to create new recipe.', { cause: error });
      }

      if (!isNull(file)) {
        await showLoading(
          async () => {
            if (isNull(newRecipe.id)) {
              throw new Error('Failed to upload image: recipe ID is null.');
            }

            const { error: imgError } = await api.client.POST('/recipes/{recipeId}/images', {
              params: { path: { recipeId: newRecipe.id } },
              body: file,
              bodySerializer(body) {
                return fileContentSerializer(body, file);
              }
            });

            if (imgError != null) {
              throw new Error('Failed to create new recipe.', { cause: imgError });
            }
          },
          'Uploading picture...');
      }

      // Update the search results since the new recipe may be in them
      await this.searchCtx?.refresh();

      await redirect(`/recipes/${newRecipe.id}`);
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to create new recipe.');
    }
  }

  private async onNewRecipeClicked() {
    const { data } = await showModal<{ recipe: Recipe; file: File | null }>({
      presentingElement: this,
      component: 'recipe-editor',
    });
    if (!isNull(data)) {
      await this.saveNewRecipe(data.recipe, data.file);
    }
  }

  private async onFilterClicked(filter: SearchFilter) {
    this.searchCtx?.setFilter({
      ...filter
    });
    await redirect('/recipes');
  }
}
