import { loadingController, modalController, popoverController, ScrollBaseDetail } from '@ionic/core';
import { Component, Element, h, Host, Method, State } from '@stencil/core';
import { RecipesApi } from '../../../helpers/api';
import { capitalizeFirstLetter, hasAccessLevel, redirect, showToast, enableBackForOverlay } from '../../../helpers/utils';
import { AccessLevel, DefaultSearchFilter, Recipe, RecipeCompact, RecipeState, SearchViewMode, SortBy, SortDir } from '../../../models';
import state from '../../../store';

@Component({
  tag: 'page-search',
  styleUrl: 'page-search.css'
})
export class PageSearch {
  @State() recipes: RecipeCompact[] = [];
  @State() numPages = 1;

  @Element() el!: HTMLPageSearchElement;
  private content!: HTMLIonContentElement;

  private scrollTop: number | null = null;

  @Method()
  async activatedCallback() {
    // Call loadRecipes, not performSearch, so that the scoll position is preserved
    await this.loadRecipes();
  }

  componentDidRender() {
    if (this.scrollTop !== null) {
      this.content.scrollToPoint(0, this.scrollTop);
    }
  }

  render() {
    return (
      <Host>
        <ion-content ref={el => this.content = el} scroll-events onIonScrollEnd={e => this.onContentScrolled(e)}>
          <ion-grid>
            <ion-row>
              <ion-col>
                <ion-buttons class="justify-content-center-lg-down">
                  <ion-button fill="solid" color="secondary" onClick={e => this.onSearchStatesClicked(e)}>
                    <ion-icon slot="start" icon="filter" />
                    {capitalizeFirstLetter(this.getRecipeStatesText(state.searchFilter.states))}
                  </ion-button>
                  <ion-button fill="solid" color="secondary" onClick={e => this.onSortByClicked(e)}>
                    <ion-icon slot="start" icon="swap-vertical" />
                    {capitalizeFirstLetter(state.searchFilter.sortBy)}
                  </ion-button>
                  {state.searchFilter.sortDir === SortDir.Asc ?
                    <ion-button fill="solid" color="secondary" onClick={() => this.setSortDir(SortDir.Desc)}>
                      <ion-icon slot="icon-only" icon="arrow-up" />
                    </ion-button>
                    :
                    <ion-button fill="solid" color="secondary" onClick={() => this.setSortDir(SortDir.Asc)}>
                      <ion-icon slot="icon-only" icon="arrow-down" />
                    </ion-button>
                  }
                  {state.searchSettings.viewMode === SearchViewMode.Card ?
                    <ion-button fill="solid" color="secondary" onClick={() => this.setViewMode(SearchViewMode.List)}>
                      <ion-icon slot="icon-only" icon="grid" />
                    </ion-button>
                    :
                    <ion-button fill="solid" color="secondary" onClick={() => this.setViewMode(SearchViewMode.Card)}>
                      <ion-icon slot="icon-only" icon="list" />
                    </ion-button>
                  }
                </ion-buttons>
              </ion-col>
              <ion-col class="ion-hide-lg-down">
                <ion-buttons class="ion-justify-content-center">
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(1)}><ion-icon slot="icon-only" icon="arrow-back" /></ion-button>
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(state.searchPage - 1)}><ion-icon slot="icon-only" icon="chevron-back" /></ion-button>
                  <ion-button fill="solid" color="secondary" disabled>{state.searchPage} of {this.numPages}</ion-button>
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(state.searchPage + 1)}><ion-icon slot="icon-only" icon="chevron-forward" /></ion-button>
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(this.numPages)}><ion-icon slot="icon-only" icon="arrow-forward" /></ion-button>
                </ion-buttons>
              </ion-col>
              <ion-col class="ion-hide-lg-down" />
            </ion-row>
          </ion-grid>
          <ion-grid class="no-pad">
            <ion-row>
              {this.recipes.map(recipe =>
                <ion-col size="12" size-md="6" size-lg="4" size-xl="3">
                  {state.searchSettings?.viewMode === SearchViewMode.Card ?
                    <recipe-card recipe={recipe} />
                    :
                    <ion-item href={`/recipes/${recipe.id}`} lines="none">
                      <ion-avatar slot="start">
                        <ion-img src={recipe.thumbnailUrl} />
                      </ion-avatar>
                      <ion-label>{recipe.name}</ion-label>
                    </ion-item>
                  }
                </ion-col>
              )}
            </ion-row>
          </ion-grid>
          <ion-grid>
            <ion-row>
              <ion-col>
                <ion-buttons class="ion-justify-content-center">
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(1)}><ion-icon slot="icon-only" icon="arrow-back" /></ion-button>
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(state.searchPage - 1)}><ion-icon slot="icon-only" icon="chevron-back" /></ion-button>
                  <ion-button fill="solid" color="secondary" disabled>{state.searchPage} of {this.numPages}</ion-button>
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(state.searchPage + 1)}><ion-icon slot="icon-only" icon="chevron-forward" /></ion-button>
                  <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(this.numPages)}><ion-icon slot="icon-only" icon="arrow-forward" /></ion-button>
                </ion-buttons>
              </ion-col>
            </ion-row>
          </ion-grid>
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

  @Method()
  async performSearch() {
    // Reset the scroll position when explicitly performing a new search
    this.scrollTop = null;

    await this.loadRecipes();
  }

  private async loadRecipes(pageNum = null) {
    // Make sure to fill in any missing fields
    const defaultFilter = new DefaultSearchFilter();
    const filter = { ...defaultFilter, ...state.searchFilter };

    this.recipes = [];
    state.searchResultCount = null;
    if (pageNum) {
      state.searchPage = pageNum;
    }
    try {
      const { total, recipes } = await RecipesApi.find(this.el, filter, state.searchPage, this.getRecipeCount());
      this.recipes = recipes ?? [];
      state.searchResultCount = total;

      this.numPages = Math.ceil(total / this.getRecipeCount());
    } catch (ex) {
      console.error(ex);
    }
  }

  private getRecipeStatesText(states: RecipeState[]) {
    if (states.includes(RecipeState.Active)) {
      if (states.includes(RecipeState.Archived)) {
        return 'all';
      }
      return RecipeState.Active;
    }

    if (states.includes(RecipeState.Archived)) {
      return RecipeState.Archived;
    }

    return RecipeState.Active;
  }

  private async setRecipeStates(states: RecipeState[]) {
    state.searchFilter = {
      ...state.searchFilter,
      states: states
    };
    state.searchPage = 1;

    await this.performSearch();
  }

  private async setSortBy(sortBy: SortBy) {
    state.searchFilter = {
      ...state.searchFilter,
      sortBy: sortBy
    };
    state.searchPage = 1;

    await this.performSearch();
  }

  private async setSortDir(sortDir: SortDir) {
    state.searchFilter = {
      ...state.searchFilter,
      sortDir: sortDir
    };
    state.searchPage = 1;

    await this.performSearch();
  }

  private async setViewMode(viewMode: SearchViewMode) {
    state.searchSettings = {
      ...state.searchSettings,
      viewMode: viewMode
    };
    state.searchPage = 1;

    await this.performSearch();
  }

  private async saveNewRecipe(recipe: Recipe, formData: FormData) {
    try {
      const newRecipeId = await RecipesApi.post(this.el, recipe);

      if (formData) {
        const loading = await loadingController.create({
          message: 'Uploading picture...',
          animated: false,
        });
        await loading.present();

        await RecipesApi.postImage(this.el, newRecipeId, formData);
        await loading.dismiss();
      }

      await redirect(`/recipes/${newRecipeId}`);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create new recipe.');
    }
  }

  private async onContentScrolled(e: CustomEvent<ScrollBaseDetail>) {
    if (!e.detail.isScrolling) {
      // Store the current scroll position
      this.scrollTop = (await this.content.getScrollElement())?.scrollTop;
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

  private async onSearchStatesClicked(e: MouseEvent) {
    const menu = await popoverController.create({
      component: 'recipe-state-selector',
      componentProps: {
        selectedStates: state.searchFilter.states
      },
      event: e
    });
    await menu.present();

    const selector = menu.querySelector('recipe-state-selector');
    selector.addEventListener('selectedStatesChanged', (e: CustomEvent<RecipeState[]>) => this.setRecipeStates(e.detail));

    await menu.onDidDismiss();

    selector.removeEventListener('selectedStatesChanged', (e: CustomEvent<RecipeState[]>) => this.setRecipeStates(e.detail));
  }

  private async onSortByClicked(e: MouseEvent) {
    const menu = await popoverController.create({
      component: 'sort-by-selector',
      componentProps: {
        sortBy: state.searchFilter.sortBy
      },
      event: e
    });
    await menu.present();

    const selector = menu.querySelector('sort-by-selector');
    selector.addEventListener('sortByChanged', (e: CustomEvent<SortBy>) => this.setSortBy(e.detail));

    await menu.onDidDismiss();

    selector.removeEventListener('sortByChanged', (e: CustomEvent<SortBy>) => this.setSortBy(e.detail));
  }

  private getRecipeCount() {
    return state.searchSettings.viewMode === SearchViewMode.Card
      ? 24
      : 60;
  }

}
