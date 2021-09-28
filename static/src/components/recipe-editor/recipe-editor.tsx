import { Component, Element, h, Prop, State } from '@stencil/core';
import { configureModalAutofocus } from '../../helpers/utils';
import { Recipe } from '../../models';
import state from '../../store';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css'
})
export class RecipeEditor {
  @Prop() recipe: Recipe | null = null;

  @State() recipeName = '';
  @State() servingSize = '';
  @State() ingredients = '';
  @State() directions = '';
  @State() storageInstructions = '';
  @State() nutritionInfo = '';
  @State() sourceUrl = '';
  @State() tags: string[] = [];
  @State() suggestedTags: string[] = [];

  @Element() el!: HTMLRecipeEditorElement;
  private form!: HTMLFormElement;
  private imageForm!: HTMLFormElement | null;
  private imageInput!: HTMLInputElement | null;
  private tagsInput!: HTMLIonInputElement | null;

  connectedCallback() {
    configureModalAutofocus(this.el);

    if (this.recipe !== null) {
      this.recipeName = this.recipe.name;
      this.servingSize = this.recipe.servingSize;
      this.ingredients = this.recipe.ingredients;
      this.directions = this.recipe.directions;
      this.storageInstructions = this.recipe.storageInstructions;
      this.nutritionInfo = this.recipe.nutritionInfo;
      this.sourceUrl = this.recipe.sourceUrl;
      this.tags = this.recipe.tags ?? [];
    }

    this.loadSuggestedTags();
  }

  render() {
    return [
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>{this.recipe === null ? 'New Recipe' : 'Edit Recipe'}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
          <ion-item>
            <ion-label position="stacked">Name</ion-label>
            <ion-input value={this.recipeName} onIonChange={e => this.recipeName = e.detail.value} required autofocus />
          </ion-item>
          {this.recipe === null ?
            <ion-item lines="full">
              <form enctype="multipart/form-data" ref={el => this.imageForm = el}>
                <ion-label position="stacked">Picture</ion-label>
                <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="padded-input" ref={el => this.imageInput = el} />
              </form>
            </ion-item>
            : ''}
          <ion-item>
            <ion-label position="stacked">Serving Size</ion-label>
            <ion-input value={this.servingSize} onIonChange={e => this.servingSize = e.detail.value} />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Ingredients</ion-label>
            <ion-textarea value={this.ingredients} onIonChange={e => this.ingredients = e.detail.value} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Directions</ion-label>
            <ion-textarea value={this.directions} onIonChange={e => this.directions = e.detail.value} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Storage/Freezer Instructions</ion-label>
            <ion-textarea value={this.storageInstructions} onIonChange={e => this.storageInstructions = e.detail.value} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Nutrition</ion-label>
            <ion-textarea value={this.nutritionInfo} onIonChange={e => this.nutritionInfo = e.detail.value} auto-grow />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Source</ion-label>
            <ion-input type="url" value={this.sourceUrl} onIonChange={e => this.sourceUrl = e.detail.value} />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Tags</ion-label>
            {this.tags.length > 0 ?
              <div class="ion-padding-top">
                {this.tags.map(tag =>
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

  private loadSuggestedTags() {
    this.suggestedTags =
      state.currentUserSettings?.favoriteTags?.filter(value => this.tags.indexOf(value) === -1)
      ?? [];
  }

  private addTag(tag: string) {
    this.tags = [
      ...this.tags,
      tag.toLowerCase()
    ].filter((value, index, self) => self.indexOf(value) === index);
    this.loadSuggestedTags();
  }

  private removeTag(tag: string) {
    this.tags = this.tags.filter(value => value !== tag);
    this.loadSuggestedTags();
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    this.el.closest('ion-modal').dismiss({
      dismissed: false,
      recipe: {
        name: this.recipeName,
        servingSize: this.servingSize,
        ingredients: this.ingredients,
        directions: this.directions,
        storageInstructions: this.storageInstructions,
        nutritionInfo: this.nutritionInfo,
        sourceUrl: this.sourceUrl,
        tags: this.tags,
      } as Recipe,
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
