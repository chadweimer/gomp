import { InputChangeEventDetail } from '@ionic/core';
import { Component, Element, Host, h, State, Prop } from '@stencil/core';
import { RecipesApi } from '../../helpers/api';
import { configureModalAutofocus } from '../../helpers/utils';
import { DefaultSearchFilter, RecipeCompact, SearchField, SearchFilter, SortBy } from '../../models';

@Component({
  tag: 'recipe-link-editor',
  styleUrl: 'recipe-link-editor.css',
})
export class RecipeLinkEditor {
  @Prop() parentRecipeId = 0;
  @State() selectedRecipeId: number | null = null;
  @State() matchingRecipes: RecipeCompact[] = [];

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
              <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>Add Link</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content scrollY={false}>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            <ion-item>
              <ion-label position="stacked">Find Recipe</ion-label>
              <ion-input onIonChange={e => this.onSearchInputChanged(e)} ref={el => this.searchInput = el} />
            </ion-item>
            <ion-content>
              <ion-list>
                <ion-radio-group value={this.selectedRecipeId} onIonChange={e => this.selectedRecipeId = e.detail.value} allow-empty-selection>
                  {this.matchingRecipes.map(recipe =>
                    <ion-item lines="full">
                      <ion-avatar slot="start">
                        <ion-img src={recipe.thumbnailUrl} />
                      </ion-avatar>
                      <ion-label>{recipe.name}</ion-label>
                      <ion-radio slot="end" value={recipe.id} />
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

  private async onSearchInputChanged(e: CustomEvent<InputChangeEventDetail>) {
    const filter: SearchFilter = {
      ...new DefaultSearchFilter(),
      query: e.detail.value,
      sortBy: SortBy.Name,
      fields: [SearchField.Name]
    };
    const { recipes } = await RecipesApi.find(this.el, filter, 1, 20);

    // Clear current selection
    this.selectedRecipeId = null;

    // Don't allow linking to self
    this.matchingRecipes = recipes?.filter(r => r.id !== this.parentRecipeId) ?? [];
  }

  private async onSaveClicked() {
    const native = await this.searchInput.getInputElement();
    if (this.selectedRecipeId === null || this.selectedRecipeId === undefined) {
      native.setCustomValidity('A recipe must be selected');
    } else {
      native.setCustomValidity('');
    }

    if (!this.form.reportValidity()) {
      return;
    }

    this.el.closest('ion-modal').dismiss({
      dismissed: false,
      recipeId: this.selectedRecipeId
    });
  }

  private onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }
}
