import { Component, Element, Host, h, State, Prop, Watch } from '@stencil/core';
import { RecipeCompact, RecipeState, SearchField, SortBy, SortDir } from '../../generated';
import { performRecipeSearch } from '../../helpers/api';
import { configureModalAutofocus, dismissContainingModal, isNull, isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'recipe-link-editor',
  styleUrl: 'recipe-link-editor.css',
  shadow: true,
})
export class RecipeLinkEditor {
  @Prop() parentRecipeId = 0;
  @State() selectedRecipeId: number | null = null;
  @State() matchingRecipes: RecipeCompact[] = [];
  @State() query = '';
  @State() includeArchived = false;

  @Element() el!: HTMLRecipeLinkEditorElement;
  private form!: HTMLFormElement;
  private searchInput!: HTMLIonInputElement;

  connectedCallback() {
    configureModalAutofocus(this.el);
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>Add Link</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content scrollY={false}>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            <ion-item lines="full">
              <ion-input label="Find Recipe" label-placement="stacked" value={this.query} type="search"
                autocorrect="on"
                spellcheck
                autofocus
                debounce={500}
                onIonInput={e => this.query = e.target.value as string}
                ref={el => this.searchInput = el} />
            </ion-item>
            <ion-content>
              <ion-list lines="none">
                <ion-list-header>
                  <ion-label>Matching Recipes</ion-label>
                  {this.includeArchived
                    ? <ion-button onClick={() => this.includeArchived = false}>Exclude Archived</ion-button>
                    : <ion-button onClick={() => this.includeArchived = true}>Include Archived</ion-button>
                  }
                </ion-list-header>
                <ion-radio-group value={this.selectedRecipeId} onIonChange={e => this.selectedRecipeId = e.detail.value} allow-empty-selection>
                  {this.matchingRecipes.map(recipe =>
                    <ion-item key={recipe.id} lines="full">
                      <ion-avatar slot="start">
                        {!isNullOrEmpty(recipe.thumbnailUrl) ? <img alt="" src={recipe.thumbnailUrl} /> : ''}
                      </ion-avatar>
                      <ion-radio value={recipe.id}>{recipe.name}</ion-radio>
                    </ion-item>
                  )}
                </ion-radio-group>
              </ion-list>
            </ion-content>
          </form>
        </ion-content>
      </Host>
    );
  }

  @Watch('query')
  @Watch('includeArchived')
  async onSearchInputChanged() {
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
    const { recipes } = await performRecipeSearch({
      sortBy: SortBy.Modified,
      sortDir: SortDir.Desc,
      query: this.query,
      withPictures: null,
      fields: [SearchField.Name],
      states: states,
      tags: []
    }, 1, 25);

    // Clear current selection
    this.selectedRecipeId = null;

    // Don't allow linking to self
    this.matchingRecipes = recipes.filter(r => r.id !== this.parentRecipeId) ?? [];
  }

  private async onSaveClicked() {
    const native = await this.searchInput.getInputElement();
    if (isNull(this.selectedRecipeId)) {
      native.setCustomValidity('A recipe must be selected');
    } else {
      native.setCustomValidity('');
    }

    if (!this.form.reportValidity()) {
      return;
    }

    dismissContainingModal(this.el, { recipeId: this.selectedRecipeId });
  }

  private onCancelClicked() {
    dismissContainingModal(this.el);
  }
}
