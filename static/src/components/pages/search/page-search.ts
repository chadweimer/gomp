import { Gesture, ScrollBaseCustomEvent } from '@ionic/core';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AccessLevel, Recipe, RecipeState, SortBy, SortDir } from '../../../helpers/schema.gen';
import { api, fileContentSerializer } from '../../../helpers/api';
import { showToast, showLoading, showModal, DEFAULT_RESULTS_PER_PAGE_OPTIONS } from '../../../helpers/modals';
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
import { searchContext, SearchContextValue, userContext, UserContextValue } from '../../../context';

import '../../recipe-card/recipe-card';
import '../../page-navigator/page-navigator';
import '../../recipe-editor/recipe-editor';
import '../../app-icon/app-icon';
import './page-search.css';

@customElement('page-search')
export class PageSearch extends LitElement {
  @consume({ context: searchContext, subscribe: true })
  @property({ attribute: false })
  searchCtx?: SearchContextValue;

  @consume({ context: userContext, subscribe: true })
  @property({ attribute: false })
  userCtx?: UserContextValue;

  @query('ion-content') private readonly content?: HTMLIonContentElement;
  private gesture: Gesture | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.gesture = createSwipeGesture(this, (swipe) => {
      const page = this.searchCtx?.page ?? 1;
      const numPages = this.searchCtx?.numPages ?? 1;
      switch (swipe) {
        case SwipeDirection.Right:
          if (page > 1) {
            this.searchCtx?.setPage(page - 1);
          }
          break;
        case SwipeDirection.Left:
          if (page < numPages) {
            this.searchCtx?.setPage(page + 1);
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
    if (!isNull(this.searchCtx?.scrollPosition) && typeof this.content?.scrollToPoint === 'function') {
      this.content.scrollToPoint(0, this.searchCtx.scrollPosition).catch(console.error);
    }
  }

  render() {
    const filter = this.searchCtx?.filter;
    const settings = this.searchCtx?.settings;
    const resultsPerPage = this.searchCtx?.resultsPerPage ?? 36;
    const results = this.searchCtx?.results;
    const page = this.searchCtx?.page ?? 1;
    const numPages = this.searchCtx?.numPages ?? 1;
    const states = filter?.states ?? [];
    const sortBy = filter?.sortBy ?? SortBy.Name;
    const sortDir = filter?.sortDir ?? SortDir.Asc;
    const viewMode = settings?.viewMode ?? SearchViewMode.Card;

    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons class="ion-justify-content-center">
            <ion-button
              id="states-menu"
              color="secondary"
              class="ion-display-none ion-display-sm-flex"
            >
              <app-icon slot="start" name="filter_list" size="small"></app-icon>
              ${insertSpacesBetweenWords(this.getRecipeStatesText(states))}
              <app-icon slot="end" name="arrow_drop_down"></app-icon>
            </ion-button>
            <ion-button id="sort-menu" color="secondary">
              <app-icon slot="start" name="swap_vert" size="small"></app-icon>
              ${insertSpacesBetweenWords(enumKeyFromValue(SortBy, sortBy))}
              <app-icon slot="end" name="arrow_drop_down"></app-icon>
            </ion-button>
            <ion-button
              color="secondary"
              @click=${() => this.setSortDir((this.searchCtx?.filter?.sortDir ?? SortDir.Asc) === SortDir.Asc ? SortDir.Desc : SortDir.Asc)}
            >
              <app-icon
                slot="start"
                name=${sortDir === SortDir.Asc ? 'arrow_upward' : 'arrow_downward'}
                size="small"
              ></app-icon>
              ${sortDir}
            </ion-button>
            <ion-button
              color="secondary"
              @click=${() => this.setViewMode((this.searchCtx?.settings?.viewMode ?? SearchViewMode.Card) === SearchViewMode.Card ? SearchViewMode.List : SearchViewMode.Card)}
            >
              <app-icon
                slot="icon-only"
                name="list_alt"
                ?fill=${viewMode === SearchViewMode.List}
              ></app-icon>
            </ion-button>
            <ion-button id="results-per-page-menu" color="secondary">
              ${resultsPerPage}
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
            ${results?.map((recipe) =>
      viewMode === SearchViewMode.Card
        ? html`
                    <ion-col size="6" size-md="4" size-lg="3" size-xl="2">
                      <recipe-card .recipe=${recipe} class="zoom"></recipe-card>
                    </ion-col>
                  `
        : html`
                    <ion-col size="12" size-md="6" size-lg="4" size-xl="3">
                      <ion-item class="recipe-item" href=${`/recipes/${recipe.id}`} title=${ifDefined(recipe.name)}>
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

        ${isAuthorized(this.userCtx?.user, AccessLevel.Editor)
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
            class="ion-justify-content-center ion-color-secondary"
            .page=${page}
            .numPages=${numPages}
            size="large"
            @pageChanged=${(e: CustomEvent<number>) => this.searchCtx?.setPage(e.detail)}
          ></page-navigator>
        </ion-toolbar>
      </ion-footer>
      <ion-popover trigger="states-menu" dismiss-on-select>
        <ion-list lines="none">
          <ion-item
            button
            color=${ifDefined(states.length === 1 && states.includes(RecipeState.Active) ? 'secondary' : undefined)}
            @click=${() => this.setRecipeStates([RecipeState.Active])}
          >
            <app-icon slot="start" name="select_check_box"></app-icon>
            Active
          </ion-item>
          <ion-item
            button
            color=${ifDefined(states.length === 1 && states.includes(RecipeState.Archived) ? 'secondary' : undefined)}
            @click=${() => this.setRecipeStates([RecipeState.Archived])}
          >
            <app-icon slot="start" name="archive"></app-icon>
            Archived
          </ion-item>
          <ion-item
            button
            color=${ifDefined(states.length === 0 || (states.includes(RecipeState.Active) && states.includes(RecipeState.Archived)) ? 'secondary' : undefined)}
            @click=${() => this.setRecipeStates([RecipeState.Active, RecipeState.Archived])}
          >
            <app-icon slot="start" name="done_all"></app-icon>
            All
          </ion-item>
        </ion-list>
      </ion-popover>
      <ion-popover trigger="sort-menu" dismiss-on-select>
        <ion-list lines="none">
        ${Object.keys(SortBy).map(
          (item) => html`
              <ion-item
                button
                color=${ifDefined(sortBy === SortBy[item as keyof typeof SortBy] ? 'secondary' : undefined)}
                @click=${() => this.setSortBy(SortBy[item as keyof typeof SortBy])}
              >
                <app-icon slot="start" name=${this.getSortByIcon(SortBy[item as keyof typeof SortBy])}></app-icon>
                ${insertSpacesBetweenWords(item)}
              </ion-item>
            `
        )}
        </ion-list>
      </ion-popover>
      <ion-popover trigger="results-per-page-menu" dismiss-on-select>
        <ion-list lines="none">
          ${DEFAULT_RESULTS_PER_PAGE_OPTIONS.map(item =>
          html`
              <ion-item
                button
                color=${ifDefined(resultsPerPage === item ? 'secondary' : undefined)}
                @click=${() => this.searchCtx?.setResultsPerPage(item)}
              >
                ${item}
              </ion-item>
            `
        )}
        </ion-list>
    </ion-popover>
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

  private getSortByIcon(sortBy: SortBy) {
    switch (sortBy) {
      case SortBy.Created:
        return 'calendar_today';
      case SortBy.Id:
        return 'id_card';
      case SortBy.Modified:
        return 'edit_calendar';
      case SortBy.Name:
        return 'sort_by_alpha';
      case SortBy.Random:
        return 'shuffle';
      case SortBy.Rating:
        return 'star';
      default:
        return 'sort';
    }
  }

  private setRecipeStates(states: RecipeState[]) {
    this.searchCtx?.setFilter({
      ...this.searchCtx.filter,
      states,
    });
  }

  private setSortBy(sortBy: SortBy) {
    this.searchCtx?.setFilter({
      ...this.searchCtx.filter,
      sortBy,
    });
  }

  private setSortDir(sortDir: SortDir) {
    this.searchCtx?.setFilter({
      ...this.searchCtx.filter,
      sortDir,
    });
  }

  private setViewMode(viewMode: SearchViewMode) {
    this.searchCtx?.setSettings({
      ...this.searchCtx.settings,
      viewMode,
    });
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
      await this.searchCtx?.refresh();

      await redirect(`/recipes/${newRecipe.id}`);
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to create new recipe.');
    }
  }

  private async onContentScrolled(e: ScrollBaseCustomEvent) {
    if (!e.detail.isScrolling) {
      const top = (await this.content?.getScrollElement())?.scrollTop;
      this.searchCtx?.setScrollPosition(top);
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
}

declare global {
  interface HTMLElementTagNameMap {
    'page-search': PageSearch;
  }
}
