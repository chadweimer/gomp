import { Component, Element, h, Prop, State } from '@stencil/core';
import { configureModalAutofocus } from '../../helpers/utils';
import { Recipe } from '../../models';
import state from '../../store';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css'
})
export class RecipeEditor {
  @Prop() recipe: Recipe = {
    name: '',
    tags: []
  };

  @State() suggestedTags: string[] = [];

  @Element() el!: HTMLRecipeEditorElement;
  private form!: HTMLFormElement;
  private imageForm!: HTMLFormElement | null;
  private imageInput!: HTMLInputElement | null;
  private tagsInput!: HTMLIonInputElement | null;

  connectedCallback() {
    configureModalAutofocus(this.el);

    this.filterSuggestedTags();
  }

  render() {
    return [
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>{!this.recipe.id ? 'New Recipe' : 'Edit Recipe'}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
          <ion-item>
            <ion-label position="stacked">Name</ion-label>
            <ion-input value={this.recipe.name} onIonChange={e => this.recipe = { ...this.recipe, name: e.detail.value }} required autofocus />
          </ion-item>
          {!this.recipe.id ?
            <ion-item lines="full">
              <form enctype="multipart/form-data" ref={el => this.imageForm = el}>
                <ion-label position="stacked">Picture</ion-label>
                <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="padded-input" ref={el => this.imageInput = el} />
              </form>
            </ion-item>
            : ''}
          <ion-item>
            <ion-label position="stacked">Serving Size</ion-label>
            <ion-input value={this.recipe.servingSize} onIonChange={e => this.recipe = { ...this.recipe, servingSize: e.detail.value }} />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Ingredients</ion-label>
            <ion-textarea value={this.recipe.ingredients} onIonChange={e => this.recipe = { ...this.recipe, ingredients: e.detail.value }} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Directions</ion-label>
            <ion-textarea value={this.recipe.directions} onIonChange={e => this.recipe = { ...this.recipe, directions: e.detail.value }} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Storage/Freezer Instructions</ion-label>
            <ion-textarea value={this.recipe.storageInstructions} onIonChange={e => this.recipe = { ...this.recipe, storageInstructions: e.detail.value }} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Nutrition</ion-label>
            <ion-textarea value={this.recipe.nutritionInfo} onIonChange={e => this.recipe = { ...this.recipe, nutritionInfo: e.detail.value }} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Source</ion-label>
            <ion-input type="url" value={this.recipe.sourceUrl} onIonChange={e => this.recipe = { ...this.recipe, sourceUrl: e.detail.value }} />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Tags</ion-label>
            {this.recipe.tags?.length > 0 ?
              <div class="ion-padding-top">
                {this.recipe.tags?.map(tag =>
                  <ion-chip onClick={() => this.removeTag(tag)}>
                    {tag}
                    <ion-icon icon="close-circle" />
                  </ion-chip>
                )}
              </div>
              : ''}
            <ion-input onKeyDown={e => this.onTagsKeyDown(e)} ref={el => this.tagsInput = el} />
          </ion-item>
          <div class="ion-padding">
            {this.suggestedTags.map(tag =>
              <ion-chip color="success" onClick={() => this.addTag(tag)}>
                {tag}
                <ion-icon icon="add-circle" />
              </ion-chip>
            )}
          </div>
        </form>
      </ion-content>
    ];
  }

  private filterSuggestedTags() {
    this.suggestedTags =
      state.currentUserSettings?.favoriteTags?.filter(value => !this.recipe.tags.includes(value))
      ?? [];
  }

  private addTag(tag: string) {
    if (!this.recipe.tags) {
      this.recipe = {
        ...this.recipe,
        tags: [tag.toLowerCase()]
      };
    } else {
      this.recipe = {
        ...this.recipe,
        tags: [
          ...this.recipe.tags,
          tag.toLowerCase()
        ].filter((value, index, self) => self.indexOf(value) === index)
      };
    }
    this.filterSuggestedTags();
  }

  private removeTag(tag: string) {
    this.recipe = {
      ...this.recipe,
      tags: this.recipe.tags.filter(value => value !== tag)
    };
    this.filterSuggestedTags();
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    this.el.closest('ion-modal').dismiss({
      dismissed: false,
      recipe: this.recipe,
      formData: this.imageInput?.value ? new FormData(this.imageForm) : null
    });
  }

  private onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }

  private onTagsKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.tagsInput.value) {
      this.addTag(this.tagsInput.value.toString());
      this.tagsInput.value = '';
    }
  }
}
