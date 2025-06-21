import { alertController, Gesture, modalController, ScrollBaseDetail } from '@ionic/core';
import { Component, Element, h, Host } from '@stencil/core';
import { AccessLevel, Recipe, RecipeState, SortBy, SortDir } from '../../../generated';
import { recipesApi, refreshSearchResults } from '../../../helpers/api';
import { redirect, showToast, enableBackForOverlay, showLoading, hasScope, createSwipeGesture, enumKeyFromValue, insertSpacesBetweenWords, isNull, isNullOrEmpty } from '../../../helpers/utils';
import { SearchViewMode, SwipeDirection } from '../../../models';
import state from '../../../stores/state';

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
    if (!isNull(state.searchScrollPosition)
      && typeof this.content.scrollToPoint === typeof Function) {
      this.content.scrollToPoint(0, state.searchScrollPosition);
    }
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons class="ion-justify-content-center">
              <ion-button color="secondary" onClick={() => this.onSearchStatesClicked()}>
                <ion-icon slot="start" icon="filter" />
                {insertSpacesBetweenWords(this.getRecipeStatesText(state.searchFilter.states))}
              </ion-button>
              <ion-button color="secondary" onClick={() => this.onSortByClicked()}>
                <ion-icon slot="start" icon="swap-vertical" />
                {insertSpacesBetweenWords(enumKeyFromValue(SortBy, state.searchFilter.sortBy))}
              </ion-button>
              <ion-button color="secondary" onClick={() => this.setSortDir(state.searchFilter.sortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc)}>
                <ion-icon slot="icon-only" icon={state.searchFilter.sortDir === SortDir.Asc ? 'arrow-up' : 'arrow-down'} />
              </ion-button>
              <ion-button color="secondary" onClick={() => this.setViewMode(state.searchSettings.viewMode === SearchViewMode.Card ? SearchViewMode.List : SearchViewMode.Card)}>
                <ion-icon slot="icon-only" icon={state.searchSettings.viewMode === SearchViewMode.Card ? 'grid' : 'list'} />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content ref={el => this.content = el} scroll-events onIonScrollEnd={e => this.onContentScrolled(e)}>
          <ion-grid class="no-pad">
            <ion-row>
              {state.searchResults?.map(recipe =>
                state.searchSettings?.viewMode === SearchViewMode.Card ?
                  <ion-col key={recipe.id} size="6" size-md="4" size-lg="3" size-xl="2">
                    <recipe-card recipe={recipe} size="small" />
                  </ion-col>
                  :
                  <ion-col key={recipe.id} size="12" size-md="6" size-lg="4" size-xl="3">
                    <ion-item href={`/recipes/${recipe.id}`} lines="none">
                      <ion-avatar slot="start">
                        {!isNullOrEmpty(recipe.thumbnailUrl) ? <img alt="" src={recipe.thumbnailUrl} /> : ''}
                      </ion-avatar>
                      <ion-label>{recipe.name}</ion-label>
                    </ion-item>
                  </ion-col>
              )}
            </ion-row>
          </ion-grid>

          {hasScope(state.jwtToken, AccessLevel.Editor) ?
            <ion-fab horizontal="end" vertical="bottom" slot="fixed">
              <ion-fab-button color="success" onClick={() => this.onNewRecipeClicked()}>
                <ion-icon icon="add" />
              </ion-fab-button>
            </ion-fab>
            : ''}
        </ion-content>

        <ion-footer>
          <ion-toolbar>
            <page-navigator class="ion-justify-content-center" color="secondary" page={state.searchPage} numPages={state.searchNumPages} onPageChanged={e => state.searchPage = e.detail} />
          </ion-toolbar>
        </ion-footer>
      </Host >
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

    return 'All';
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

  private async onSearchStatesClicked() {
    const menu = await alertController.create({
      header: 'States',
      inputs: Object.keys(RecipeState).map(item => ({
        type: 'checkbox',
        label: insertSpacesBetweenWords(item),
        value: RecipeState[item],
        checked: state.searchFilter.states.includes(RecipeState[item])
      })),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: (selectedStates: RecipeState[]) => this.setRecipeStates(selectedStates)
        }
      ]
    });
    await menu.present();
  }

  private async onSortByClicked() {
    const menu = await alertController.create({
      header: 'Sort By',
      inputs: Object.keys(SortBy).map(item => ({
        type: 'radio',
        label: insertSpacesBetweenWords(item),
        value: SortBy[item],
        checked: state.searchFilter.sortBy === SortBy[item]
      })),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: (sortBy: SortBy) => this.setSortBy(sortBy)
        }
      ]
    });
    await menu.present();
  }

}
