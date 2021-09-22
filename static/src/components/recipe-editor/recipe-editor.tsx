import { Component, Element, h, Prop, State } from '@stencil/core';
import { Recipe } from '../../models';

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

  @Element() el: HTMLRecipeEditorElement;
  private form: HTMLFormElement;

  connectedCallback() {
    if (this.recipe !== null) {
      this.recipeName = this.recipe.name;
      this.servingSize = this.recipe.servingSize;
      this.ingredients = this.recipe.ingredients;
      this.directions = this.recipe.directions;
      this.storageInstructions = this.recipe.storageInstructions;
      this.nutritionInfo = this.recipe.nutritionInfo;
      this.sourceUrl = this.recipe.sourceUrl;
      this.tags = this.recipe.tags;
    }
  }

  render() {
    return (
      <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
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
        </ion-header>

        <ion-content>
          <ion-item>
            <ion-label position="stacked">Name</ion-label>
            <ion-input value={this.recipeName} onIonChange={e => this.recipeName = e.detail.value} required/>
          </ion-item>
          <ion-item lines="full">
            <form id="mainImageForm" enctype="multipart/form-data">
              <ion-label position="stacked">Picture</ion-label>
              <input id="mainImage" name="file_content" type="file" accept=".jpg,.jpeg,.png" class="padded-input" />
            </form>
          </ion-item>
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
        </ion-content>
      </form>
    );
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
      } as Recipe
    });
  }

  private onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }

}
