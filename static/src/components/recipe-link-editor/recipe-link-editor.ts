import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RecipeCompact, RecipeState, SearchField, SortBy, SortDir } from '../../helpers/schema.gen';
import { api } from '../../helpers/api';
import { getContainingModal } from '../../helpers/modals';
import { getRecipeThumbnailUrl, isNull, isNullOrEmpty } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';

@customElement('recipe-link-editor')
export class RecipeLinkEditor extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }

      .sc-ion-searchbar-md-h {
        height: 48px;
      }
    `
  ];

  @property({ type: Number }) parentRecipeId = 0;

  @state() private selectedRecipeId: number | null = null;
  @state() private matchingRecipes: RecipeCompact[] = [];
  @state() private query = '';
  @state() private includeArchived = false;

  private parentModal?: HTMLIonModalElement | null;

  connectedCallback() {
    super.connectedCallback();
    this.parentModal = getContainingModal(this);
  }

  updated(changedProperties: PropertyValues) {
    if (
      (changedProperties.has('query') && changedProperties.get('query') !== undefined) ||
      (changedProperties.has('includeArchived') && changedProperties.get('includeArchived') !== undefined)
    ) {
      this.onSearchInputChanged().catch(console.error);
    }
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons slot="primary">
            <ion-button color="primary" @click=${() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>Add Link</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" @click=${() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content .scrollY=${false}>
        <form @submit=${(e: Event) => e.preventDefault()}>
          <ion-item lines="full">
            <ion-input
              label="Find Recipe"
              label-placement="stacked"
              .value=${this.query}
              type="search"
              autofocus
              .debounce=${500}
              @ionInput=${(e: CustomEvent) => (this.query = (e.detail.value ?? '') as string)}
            ></ion-input>
          </ion-item>
          <ion-content>
            <ion-list lines="none">
              <ion-list-header>
                <ion-label>Matching Recipes</ion-label>
                ${this.includeArchived
        ? html`<ion-button @click=${() => (this.includeArchived = false)}>Exclude Archived</ion-button>`
        : html`<ion-button @click=${() => (this.includeArchived = true)}>Include Archived</ion-button>`}
              </ion-list-header>
              <ion-radio-group
                .value=${this.selectedRecipeId}
                @ionChange=${(e: CustomEvent<{ value: number }>) => (this.selectedRecipeId = e.detail.value)}
                allow-empty-selection
              >
                ${this.matchingRecipes?.map(
          (recipe) => html`
                    <ion-item lines="full">
                      <ion-thumbnail slot="start" class="preview">
                        ${!isNullOrEmpty(recipe.mainImageName)
              ? html`<img alt="" src=${getRecipeThumbnailUrl(recipe.id, recipe.mainImageName)} />`
              : ''}
                      </ion-thumbnail>
                      <ion-radio .value=${recipe.id}>${recipe.name}</ion-radio>
                    </ion-item>
                  `
        )}
              </ion-radio-group>
            </ion-list>
          </ion-content>
        </form>
      </ion-content>
    `;
  }

  private async onSearchInputChanged() {
    // Require at least 2 characters to search
    if (isNullOrEmpty(this.query) || this.query.length < 2) {
      this.matchingRecipes = [];
      this.selectedRecipeId = null;
      return;
    }

    let states: RecipeState[] = [RecipeState.Active];
    if (this.includeArchived) {
      states = [...states, RecipeState.Archived];
    }

    const { recipes } = await api.performRecipeSearch(
      {
        sortBy: SortBy.Modified,
        sortDir: SortDir.Desc,
        query: this.query,
        withPictures: null,
        states,
        fields: [SearchField.Name],
        tags: [],
      },
      1,
      25
    );

    this.matchingRecipes = recipes?.filter((r) => r.id !== this.parentRecipeId) ?? [];
  }

  private async onSaveClicked() {
    if (isNull(this.selectedRecipeId)) {
      return;
    }

    await this.parentModal?.dismiss(
      {
        recipeId: this.selectedRecipeId,
      },
      'save'
    );
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-link-editor': RecipeLinkEditor;
  }
}
