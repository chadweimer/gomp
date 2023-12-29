import { Gesture, modalController, popoverController, ScrollBaseDetail } from '@ionic/core';
import { Component, Element, h, Host } from '@stencil/core';
import { AccessLevel, Recipe, RecipeState, SortBy, SortDir } from '../../../generated';
import { recipesApi } from '../../../helpers/api';
import { redirect, showToast, enableBackForOverlay, showLoading, hasScope, createSwipeGesture, enumKeyFromValue, insertSpacesBetweenWords, isNull, isNullOrEmpty } from '../../../helpers/utils';
import { SearchViewMode, SwipeDirection } from '../../../models';
import state, { refreshSearchResults } from '../../../stores/state';

@Component({
  tag: 'page-search',
  styleUrl: 'page-search.css'
})
export class PageSearch {
  @Element() el!: HTMLPageSearchElement;
  private content!: HTMLIonContentElement;
  private gesture: Gesture;

  connectedCallback() {
    this.gesture = createSwipeGesture(this.el, swipe => {
      switch (swipe) {
        case SwipeDirection.Right:
          if (state.searchPage > 1) {
            state.searchPage--;
          }
          break;
        case SwipeDirection.Left:
          if (state.searchPage < state.searchNumPages) {
            state.searchPage++;
          }
          break;
      }
    });
    this.gesture.enable();
  }

  disconnectedCallback() {
    this.gesture.destroy();
    this.gesture = null;
  }

  componentDidRender() {
    if (typeof state.searchScrollPosition !== typeof undefined
      && state.searchScrollPosition !== null
      && typeof this.content.scrollToPoint === typeof Function) {
      this.content.scrollToPoint(0, state.searchScrollPosition);
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
                    {insertSpacesBetweenWords(this.getRecipeStatesText(state.searchFilter.states))}
                  </ion-button>
                  <ion-button fill="solid" color="secondary" onClick={e => this.onSortByClicked(e)}>
                    <ion-icon slot="start" icon="swap-vertical" />
                    {insertSpacesBetweenWords(enumKeyFromValue(SortBy, state.searchFilter.sortBy))}
                  </ion-button>
                  <ion-button fill="solid" color="secondary" onClick={() => this.setSortDir(state.searchFilter.sortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc)}>
                    <ion-icon slot="icon-only" icon={state.searchFilter.sortDir === SortDir.Asc ? 'arrow-up' : 'arrow-down'} />
                  </ion-button>
                  <ion-button fill="solid" color="secondary" onClick={() => this.setViewMode(state.searchSettings.viewMode === SearchViewMode.Card ? SearchViewMode.List : SearchViewMode.Card)}>
                    <ion-icon slot="icon-only" icon={state.searchSettings.viewMode === SearchViewMode.Card ? 'grid' : 'list'} />
                  </ion-button>
                </ion-buttons>
              </ion-col>
              <ion-col class="ion-hide-lg-down">
                <page-navigator class="ion-justify-content-center" page={state.searchPage} numPages={state.searchNumPages} onPageChanged={e => state.searchPage = e.detail} />
              </ion-col>
              <ion-col class="ion-hide-lg-down" />
            </ion-row>
          </ion-grid>
          <ion-grid class="no-pad">
            <ion-row>
              {state.searchResults?.map(recipe =>
                <ion-col key={recipe.id} size="12" size-md="6" size-lg="4" size-xl="3">
                  {state.searchSettings?.viewMode === SearchViewMode.Card ?
                    <recipe-card recipe={recipe} />
                    :
                    <ion-item href={`/recipes/${recipe.id}`} lines="none">
                      <ion-avatar slot="start">
                        {!isNullOrEmpty(recipe.thumbnailUrl) ? <img alt="" src={recipe.thumbnailUrl} /> : ''}
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
                <page-navigator class="ion-justify-content-center" page={state.searchPage} numPages={state.searchNumPages} onPageChanged={e => state.searchPage = e.detail} />
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>

        {hasScope(state.jwtToken, AccessLevel.Editor) ?
          <ion-fab horizontal="end" vertical="bottom" slot="fixed">
            <ion-fab-button color="success" onClick={() => this.onNewRecipeClicked()}>
              <ion-icon icon="add" />
            </ion-fab-button>
          </ion-fab>
          : ''}
      </Host>
    );
  }

  private getRecipeStatesText(states: RecipeState[]) {
    if (states.includes(RecipeState.Active)) {
      if (states.includes(RecipeState.Archived)) {
        return 'All';
      }
      return enumKeyFromValue(RecipeState, RecipeState.Active);
    }

    if (states.includes(RecipeState.Archived)) {
      return enumKeyFromValue(RecipeState, RecipeState.Archived);
    }

    return enumKeyFromValue(RecipeState, RecipeState.Active);
  }

  private setRecipeStates(states: RecipeState[]) {
    state.searchFilter = {
      ...state.searchFilter,
      states: states
    };
  }

  private setSortBy(sortBy: SortBy) {
    state.searchFilter = {
      ...state.searchFilter,
      sortBy: sortBy
    };
  }

  private setSortDir(sortDir: SortDir) {
    state.searchFilter = {
      ...state.searchFilter,
      sortDir: sortDir
    };
  }

  private setViewMode(viewMode: SearchViewMode) {
    state.searchSettings = {
      ...state.searchSettings,
      viewMode: viewMode
    };
  }

  private async saveNewRecipe(recipe: Recipe, file: File) {
    try {
      const { data: newRecipe } = await recipesApi.addRecipe(recipe);

      if (file !== null) {
        await showLoading(
          async () => {
            await recipesApi.uploadImage(newRecipe.id, file);
          },
          'Uploading picture...');
      }

      // Update the search results since the new recipe may be in them
      await refreshSearchResults();

      await redirect(`/recipes/${newRecipe.id}`);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create new recipe.');
    }
  }

  private async onContentScrolled(e: CustomEvent<ScrollBaseDetail>) {
    if (!e.detail.isScrolling) {
      // Store the current scroll position
      state.searchScrollPosition = (await this.content.getScrollElement())?.scrollTop;
    }
  }

  private async onNewRecipeClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'recipe-editor',
        animated: false,
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ recipe: Recipe, file: File }>();
      if (!isNull(data)) {
        await this.saveNewRecipe(data.recipe, data.file);
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

}
