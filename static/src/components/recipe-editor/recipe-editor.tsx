import { Component, Element, h, Prop } from '@stencil/core';
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

  @Element() el!: HTMLRecipeEditorElement;
  private form!: HTMLFormElement;
  private imageForm!: HTMLFormElement | null;
  private imageInput!: HTMLInputElement | null;

  connectedCallback() {
    configureModalAutofocus(this.el);
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
          <tags-input value={this.recipe.tags} suggestions={state.currentUserSettings?.favoriteTags ?? []}
            onValueChanged={e => this.recipe = { ...this.recipe, tags: e.detail }} />
        </form>
      </ion-content>
    ];
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
}
