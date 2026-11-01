import { Gesture, ScrollBaseCustomEvent } from '@ionic/core';
import { LitElement, html, nothing } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AccessLevel, Recipe, RecipeState, SortBy, SortDir } from '../../../helpers/schema.gen';
import { api, fileContentSerializer, refreshSearchResults } from '../../../helpers/api';
import { showToast, showLoading, showResultsPerPageAlert, showModal, showAlert } from '../../../helpers/modals';
import {
  redirect,
  createSwipeGesture,
  enumKeyFromValue,
  insertSpacesBetweenWords,
  isNull,
  isNullOrEmpty,
  isAuthorized,
  getRecipeThumbnailUrl,
} from '../../../helpers/utils';
import { SearchViewMode, SwipeDirection } from '../../../models';
import state, { appStateStore } from '../../../stores/state';
import { StoreController } from '../../../stores/store';

import '../../recipe-card/recipe-card';
import '../../page-navigator/page-navigator';
import '../../recipe-editor/recipe-editor';
import '../../app-icon/app-icon';
import './page-search.css';

@customElement('page-search')
export class PageSearch extends LitElement {
  protected stateController = new StoreController(this, appStateStore);

  @query('ion-content') private readonly content?: HTMLIonContentElement;
  private gesture: Gesture | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.gesture = createSwipeGesture(this, (swipe) => {
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
    this.gesture?.enable();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.gesture?.destroy();
    this.gesture = null;
  }

  updated() {
    if (!isNull(state.searchScrollPosition) && typeof this.content?.scrollToPoint === 'function') {
      this.content.scrollToPoint(0, state.searchScrollPosition).catch(console.error);
    }
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons class="ion-justify-content-center">
            <ion-button
              color="secondary"
              class="ion-display-none ion-display-sm-flex"
              @click=${() => this.onSearchStatesClicked()}
            >
              <app-icon slot="start" name="filter_list"></app-icon>
              ${insertSpacesBetweenWords(this.getRecipeStatesText(state.searchFilter.states))}
              <app-icon slot="end" name="arrow_drop_down"></app-icon>
            </ion-button>
            <ion-button color="secondary" @click=${() => this.onSortByClicked()}>
              <app-icon slot="start" name="swap_vert"></app-icon>
              ${insertSpacesBetweenWords(enumKeyFromValue(SortBy, state.searchFilter.sortBy))}
              <app-icon slot="end" name="arrow_drop_down"></app-icon>
            </ion-button>
            <ion-button
              color="secondary"
              @click=${() => this.setSortDir(state.searchFilter.sortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc)}
            >
              <app-icon
                slot="icon-only"
                name=${state.searchFilter.sortDir === SortDir.Asc ? 'arrow_upward' : 'arrow_downward'}
              ></app-icon>
            </ion-button>
            <ion-button
              color="secondary"
              @click=${() => this.setViewMode(state.searchSettings.viewMode === SearchViewMode.Card ? SearchViewMode.List : SearchViewMode.Card)}
            >
              <app-icon
                slot="icon-only"
                name=${state.searchSettings.viewMode === SearchViewMode.Card ? 'grid_view' : 'view_list'}
              ></app-icon>
            </ion-button>
            <ion-button color="secondary" @click=${() => this.onResultsPerPage()}>
              ${state.searchResultsPerPage}
              <app-icon slot="end" name="arrow_drop_down"></app-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content
        scroll-events
        @ionScrollEnd=${(e: ScrollBaseCustomEvent) => this.onContentScrolled(e)}
      >
        <ion-grid class="no-pad">
          <ion-row>
            ${state.searchResults?.map((recipe) =>
      state.searchSettings?.viewMode === SearchViewMode.Card
        ? html`
                    <ion-col size="6" size-md="4" size-lg="3" size-xl="2">
                      <recipe-card .recipe=${recipe} class="zoom"></recipe-card>
                    </ion-col>
                  `
        : html`
                    <ion-col size="12" size-md="6" size-lg="4" size-xl="3">
                      <ion-item href=${`/recipes/${recipe.id}`} title=${ifDefined(recipe.name)}>
                        <ion-thumbnail slot="start" class="preview">
                          ${!isNullOrEmpty(recipe.mainImageName)
            ? html`<img loading="lazy" alt="" src=${ifDefined(getRecipeThumbnailUrl(recipe.id, recipe.mainImageName))} />`
            : nothing}
                        </ion-thumbnail>
                        <ion-label class="single-line">${recipe.name}</ion-label>
                        ${recipe.state === RecipeState.Archived
            ? html`<ion-badge color="medium" slot="end">Archived</ion-badge>`
            : nothing}
                      </ion-item>
                    </ion-col>
                  `
    )}
          </ion-row>
        </ion-grid>

        ${isAuthorized(state.currentUser, AccessLevel.Editor)
        ? html`
              <ion-fab horizontal="end" vertical="bottom" slot="fixed">
                <ion-fab-button color="secondary" @click=${() => this.onNewRecipeClicked()}>
                  <app-icon name="add"></app-icon>
                </ion-fab-button>
              </ion-fab>
            `
        : nothing}
      </ion-content>

      <ion-footer>
        <ion-toolbar color="light">
          <page-navigator
            class="ion-justify-content-center"
            color="secondary"
            .page=${state.searchPage}
            .numPages=${state.searchNumPages}
            @pageChanged=${(e: CustomEvent<number>) => (state.searchPage = e.detail)}
          ></page-navigator>
        </ion-toolbar>
      </ion-footer>
    `;
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
      states,
    };
  }

  private setSortBy(sortBy: SortBy) {
    state.searchFilter = {
      ...state.searchFilter,
      sortBy,
    };
  }

  private setSortDir(sortDir: SortDir) {
    state.searchFilter = {
      ...state.searchFilter,
      sortDir,
    };
  }

  private setViewMode(viewMode: SearchViewMode) {
    state.searchSettings = {
      ...state.searchSettings,
      viewMode,
    };
  }

  private async saveNewRecipe(recipe: Recipe, file: File | null) {
    try {
      const { data: newRecipe, error } = await api.client.POST('/recipes', {
        body: recipe,
      });

      if (error) {
        throw new Error('Failed to create new recipe', { cause: error });
      }

      if (!isNull(file)) {
        await showLoading(async () => {
          if (isNull(newRecipe.id)) {
            throw new Error('Failed to upload image: recipe ID is null.');
          }

          const { error: uploadError } = await api.client.POST('/recipes/{recipeId}/images', {
            params: { path: { recipeId: newRecipe.id } },
            body: file,
            bodySerializer(body) {
              return fileContentSerializer(body, file);
            },
          });

          if (uploadError) {
            throw new Error('Failed to create new recipe.', { cause: uploadError });
          }
        }, 'Uploading picture...');
      }

      // Update the search results since the new recipe may be in them
      await refreshSearchResults();

      await redirect(`/recipes/${newRecipe.id}`);
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to create new recipe.');
    }
  }

  private async onContentScrolled(e: ScrollBaseCustomEvent) {
    if (!e.detail.isScrolling) {
      state.searchScrollPosition = (await this.content?.getScrollElement())?.scrollTop;
    }
  }

  private async onNewRecipeClicked() {
    const { data } = await showModal<{ recipe: Recipe; file: File }>({
      presentingElement: this,
      component: 'recipe-editor',
    });
    if (!isNull(data)) {
      await this.saveNewRecipe(data.recipe, data.file);
    }
  }

  private async onSearchStatesClicked() {
    const { data, role } = await showAlert<{ values: RecipeState[] }>({
      header: 'States',
      inputs: Object.keys(RecipeState).map((item) => ({
        type: 'checkbox',
        label: insertSpacesBetweenWords(item),
        value: RecipeState[item as keyof typeof RecipeState],
        checked: state.searchFilter.states.includes(RecipeState[item as keyof typeof RecipeState]),
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'OK', role: 'confirm' },
      ],
    });
    if (role === 'confirm') {
      this.setRecipeStates(data?.values ?? state.searchFilter.states);
    }
  }

  private async onSortByClicked() {
    const { data, role } = await showAlert<{ values: SortBy }>({
      header: 'Sort By',
      inputs: Object.keys(SortBy).map((item) => ({
        type: 'radio',
        label: insertSpacesBetweenWords(item),
        value: SortBy[item as keyof typeof SortBy],
        checked: state.searchFilter.sortBy === SortBy[item as keyof typeof SortBy],
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'OK', role: 'confirm' },
      ],
    });
    if (role === 'confirm') {
      this.setSortBy(data?.values ?? state.searchFilter.sortBy);
    }
  }

  private async onResultsPerPage() {
    await showResultsPerPageAlert(state.searchResultsPerPage, (count) => {
      state.searchResultsPerPage = count;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-search': PageSearch;
  }
}
