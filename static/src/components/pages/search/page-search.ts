import { Gesture, ScrollBaseCustomEvent } from '@ionic/core';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AccessLevel, Recipe, RecipeCompact, RecipeState, SortBy, SortDir, UserSettings } from '../../../helpers/schema.gen';
import { api, fileContentSerializer } from '../../../helpers/api';
import { showAlert, showToast, showLoading, showModal, DEFAULT_RESULTS_PER_PAGE_OPTIONS } from '../../../helpers/modals';
import {
  redirect,
  createSwipeGesture,
  enumKeyFromValue,
  insertSpacesBetweenWords,
  isNullOrEmpty,
  isAuthorized,
  getRecipeThumbnailUrl,
} from '../../../helpers/utils';
import { SearchViewMode, SwipeDirection } from '../../../models';
import { searchContext, SearchContextValue, userContext, UserContextValue } from '../../../context';

import '../../recipe-card/recipe-card';
import '../../page-navigator/page-navigator';
import '../../recipe-editor/recipe-editor';
import '../../bulk-editor/bulk-editor';
import { BulkEditResult } from '../../bulk-editor/bulk-editor';
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

  @state() isSelectMode: boolean = false;
  @state() selectedIds: Set<number> = new Set();
  @state() private currentUserSettings: UserSettings | null = null;

  @query('ion-content') private readonly content?: HTMLIonContentElement;
  private gesture: Gesture | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    api.loadUserSettings().then(res => this.currentUserSettings = res, console.error);
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
    if (this.searchCtx?.scrollPosition != null && typeof this.content?.scrollToPoint === 'function') {
      this.content.scrollToPoint(0, this.searchCtx.scrollPosition).catch(console.error);
    }
  }

  render() {
    const renderRecipeCard = (recipe: RecipeCompact) => html`
      <ion-col size="6" size-md="4" size-lg="3" size-xl="2">
        <recipe-card
          .recipe=${recipe}
          class="zoom"
          ?isSelectMode=${this.isSelectMode}
          ?isSelected=${recipe.id != null && this.selectedIds.has(recipe.id)}
          @card-context-select=${() => recipe.id != null && this.onCardContextSelect(recipe.id)}
          @card-toggle-select=${() => recipe.id != null && this.toggleSelect(recipe.id)}
        ></recipe-card>
      </ion-col>
    `;
    const renderRecipeItem = (recipe: RecipeCompact) => html`
      <ion-col size="12" size-md="6" size-lg="4" size-xl="3">
        <ion-item
          class="recipe-item"
          href=${ifDefined(this.isSelectMode || recipe.id == null ? undefined : `/recipes/${recipe.id}`)}
          title=${ifDefined(recipe.name)}
          @contextmenu=${(e: MouseEvent) => {
        if (recipe.id == null) return;
        e.preventDefault();
        this.onCardContextSelect(recipe.id);
      }}
          @click=${this.isSelectMode && recipe.id != null ? (e: Event) => {
        e.preventDefault();
        if (recipe.id != null) {
          this.toggleSelect(recipe.id);
        }
      } : nothing}
        >
          ${this.isSelectMode && recipe.id != null ? html`
            <ion-checkbox
              slot="start"
              .checked=${this.selectedIds.has(recipe.id)}
              @click=${(e: Event) => e.stopPropagation()}
              @ionChange=${(e: CustomEvent) => {
          e.stopPropagation();
          if (recipe.id != null) {
            this.toggleSelect(recipe.id);
          }
        }}
            ></ion-checkbox>
          ` : nothing}
          <ion-thumbnail slot="start" class="preview">
            ${!isNullOrEmpty(recipe.mainImageName) ? html`
              <img loading="lazy" alt="" src=${ifDefined(getRecipeThumbnailUrl(recipe.id, recipe.mainImageName))} />
            ` : nothing}
          </ion-thumbnail>
          <ion-label class="single-line">${recipe.name}</ion-label>
          ${recipe.state === RecipeState.Archived ? html`<ion-badge color="medium" slot="end">Archived</ion-badge>` : nothing}
        </ion-item>
      </ion-col>
    `;

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

    const currentRecipes = (results ?? []).filter((r): r is RecipeCompact & { id: number } => r.id != null);
    const allCurrentPageSelected = currentRecipes.length > 0 && currentRecipes.every(r => this.selectedIds.has(r.id));

    return html`
      <ion-header>
        ${this.isSelectMode ? html`
          <ion-toolbar color="secondary">
            <ion-buttons slot="start">
              <ion-button @click=${() => this.exitSelectMode()}>
                <app-icon slot="icon-only" name="close"></app-icon>
              </ion-button>
              <ion-title size="small">${this.selectedIds.size} selected</ion-title>
            </ion-buttons>
            <ion-buttons slot="end">
              <ion-button @click=${() => this.toggleSelectAll()}>
                ${allCurrentPageSelected ? 'Deselect' : 'Select'} All
              </ion-button>
              <ion-button class="ion-display-none ion-display-sm-flex" ?disabled=${this.selectedIds.size === 0} @click=${() => this.onBulkEdit()}>
                <app-icon slot="start" name="edit" size="small"></app-icon>
                Edit
              </ion-button>
              <ion-button class="ion-display-sm-none" ?disabled=${this.selectedIds.size === 0} @click=${() => this.onBulkEdit()}>
                <app-icon slot="icon-only" name="edit" size="small"></app-icon>
              </ion-button>
              <ion-button class="ion-display-none ion-display-sm-flex" ?disabled=${this.selectedIds.size === 0} @click=${() => this.onBulkDelete()}>
                <app-icon slot="start" name="delete" size="small"></app-icon>
                Delete
              </ion-button>
              <ion-button class="ion-display-sm-none" ?disabled=${this.selectedIds.size === 0} @click=${() => this.onBulkDelete()}>
                <app-icon slot="icon-only" name="delete" size="small"></app-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        ` : html`
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
              ${isAuthorized(this.userCtx?.user, AccessLevel.Editor) ? html`
                <ion-button id="select-mode-button" class="ion-display-none ion-display-sm-flex" color="secondary" @click=${() => this.enterSelectMode()}>
                  <app-icon slot="start" name="checklist" size="small"></app-icon>
                  Select
                </ion-button>
                <ion-button id="select-mode-button" class="ion-display-sm-none" color="secondary" @click=${() => this.enterSelectMode()}>
                  <app-icon slot="icon-only" name="checklist" size="small"></app-icon>
                </ion-button>
              ` : nothing}
            </ion-buttons>
          </ion-toolbar>
        `}
      </ion-header>

      <ion-content
        scroll-events
        @ionScrollEnd=${(e: ScrollBaseCustomEvent) => this.onContentScrolled(e)}
      >
        <ion-grid class="no-pad">
          <ion-row>
            ${results?.map((recipe) => viewMode === SearchViewMode.Card ? renderRecipeCard(recipe) : renderRecipeItem(recipe))}
          </ion-row>
        </ion-grid>

        ${isAuthorized(this.userCtx?.user, AccessLevel.Editor) && !this.isSelectMode ? html`
          <ion-fab horizontal="end" vertical="bottom" slot="fixed">
            <ion-fab-button color="secondary" @click=${() => this.onNewRecipeClicked()}>
              <app-icon name="add"></app-icon>
            </ion-fab-button>
          </ion-fab>`
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
        ${Object.keys(SortBy).map((item) => html`
          <ion-item
            button
            color=${ifDefined(sortBy === SortBy[item as keyof typeof SortBy] ? 'secondary' : undefined)}
            @click=${() => this.setSortBy(SortBy[item as keyof typeof SortBy])}
          >
            <app-icon slot="start" name=${this.getSortByIcon(SortBy[item as keyof typeof SortBy])}></app-icon>
            ${insertSpacesBetweenWords(item)}
          </ion-item>
        `)}
        </ion-list>
      </ion-popover>
      <ion-popover trigger="results-per-page-menu" dismiss-on-select>
        <ion-list lines="none">
          ${DEFAULT_RESULTS_PER_PAGE_OPTIONS.map(item => html`
            <ion-item
              button
              color=${ifDefined(resultsPerPage === item ? 'secondary' : undefined)}
              @click=${() => this.searchCtx?.setResultsPerPage(item)}
            >
              ${item}
            </ion-item>
          `)}
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
      case SortBy.Relevance:
        return 'wand_shine';
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

      if (error != null) {
        throw new Error('Failed to create new recipe', { cause: error });
      }

      if (file != null) {
        await showLoading(async () => {
          if (newRecipe.id == null) {
            throw new Error('Failed to upload image: recipe ID is null.');
          }

          const { error: uploadError } = await api.client.POST('/recipes/{recipeId}/images', {
            params: { path: { recipeId: newRecipe.id } },
            body: file,
            bodySerializer(body) {
              return fileContentSerializer(body, file);
            },
          });

          if (uploadError != null) {
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
    if (data != null) {
      await this.saveNewRecipe(data.recipe, data.file);
    }
  }

  enterSelectMode(initialId?: number) {
    this.isSelectMode = true;
    this.selectedIds = new Set(initialId != null ? [initialId] : []);
  }

  exitSelectMode() {
    this.isSelectMode = false;
    this.selectedIds = new Set();
  }

  toggleSelect(id: number) {
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds = next;
  }

  toggleSelectAll() {
    const currentRecipes = (this.searchCtx?.results ?? []).filter((r): r is RecipeCompact & { id: number } => r.id != null);
    const allSelected = currentRecipes.length > 0 && currentRecipes.every(r => this.selectedIds.has(r.id));
    if (allSelected) {
      const next = new Set(this.selectedIds);
      for (const r of currentRecipes) {
        next.delete(r.id);
      }
      this.selectedIds = next;
    } else {
      const next = new Set(this.selectedIds);
      for (const r of currentRecipes) {
        next.add(r.id);
      }
      this.selectedIds = next;
    }
  }

  private onCardContextSelect(recipeId: number) {
    if (!isAuthorized(this.userCtx?.user, AccessLevel.Editor)) {
      return;
    }
    this.enterSelectMode(recipeId);
  }

  private async onBulkEdit() {
    if (this.selectedIds.size === 0) return;

    const { data, role } = await showModal<BulkEditResult>({
      presentingElement: this,
      component: 'bulk-editor',
      componentProps: {
        count: this.selectedIds.size,
        favoriteTags: this.currentUserSettings?.favoriteTags ?? [],
      },
    });

    if (
      role === 'save' &&
      data != null &&
      (data.state != null || data.addTags.length > 0 || data.removeTags.length > 0)
    ) {
      await showLoading(async () => {
        try {
          const ids = Array.from(this.selectedIds);
          const { error } = await api.client.PATCH('/recipes', {
            body: {
              ids,
              state: data.state,
              addTags: data.addTags.length > 0 ? data.addTags : undefined,
              removeTags: data.removeTags.length > 0 ? data.removeTags : undefined,
            },
          });
          if (error != null) {
            throw new Error('Failed to update recipes', { cause: error });
          }
          await showToast(`Updated ${ids.length} ${ids.length === 1 ? 'recipe' : 'recipes'}.`);
          await this.searchCtx?.refresh();
          this.exitSelectMode();
        } catch (ex) {
          console.error(ex);
          await showToast('Failed to update recipes.');
        }
      });
    }
  }

  private async onBulkDelete() {
    if (this.selectedIds.size === 0) return;

    const count = this.selectedIds.size;
    const { role } = await showAlert({
      header: 'Delete Recipes?',
      message: `Are you sure you want to permanently delete ${count} ${count === 1 ? 'recipe' : 'recipes'}? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' },
      ],
    });

    if (role !== 'destructive') return;

    await showLoading(async () => {
      try {
        const ids = Array.from(this.selectedIds);
        const { error } = await api.client.DELETE('/recipes', {
          params: { query: { ids } },
        });
        if (error != null) {
          throw new Error('Failed to delete recipes', { cause: error });
        }
        await showToast(`Deleted ${ids.length} ${ids.length === 1 ? 'recipe' : 'recipes'}.`);
        await this.searchCtx?.refresh();
        this.exitSelectMode();
      } catch (ex) {
        console.error(ex);
        await showToast('Failed to delete recipes.');
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-search': PageSearch;
  }
}
