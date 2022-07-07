
import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { Recipe, UserSettings } from '../../generated';
import { loadUserSettings } from '../../helpers/api';
import { configureModalAutofocus, dismissContainingModal, insertIfTabKey } from '../../helpers/utils';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css'
})
export class RecipeEditor {
  @Prop() recipe: Recipe = {
    name: '',
    servingSize: '',
    nutritionInfo: '',
    ingredients: '',
    directions: '',
    storageInstructions: '',
    sourceUrl: '',
    tags: []
  };

  @State() currentUserSettings: UserSettings | null;

  @Element() el!: HTMLRecipeEditorElement;
  private form!: HTMLFormElement;
  private imageInput!: HTMLInputElement;

  async connectedCallback() {
    this.currentUserSettings = await loadUserSettings();
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
            <ion-title>{!this.recipe.id ? 'New Recipe' : 'Edit Recipe'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            <ion-item>
              <ion-label position="stacked">Name</ion-label>
              <ion-input value={this.recipe.name} onIonChange={e => this.recipe = { ...this.recipe, name: e.detail.value }} required autofocus />
            </ion-item>
            {!this.recipe.id ?
              <ion-item lines="full">
                <form enctype="multipart/form-data">
                  <ion-label position="stacked">Picture</ion-label>
                  <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" ref={el => this.imageInput = el} />
                </form>
              </ion-item>
              : ''}
            <ion-item>
              <ion-label position="stacked">Serving Size</ion-label>
              <ion-input value={this.recipe.servingSize} onIonChange={e => this.recipe = { ...this.recipe, servingSize: e.detail.value }} />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Ingredients</ion-label>
              <ion-textarea value={this.recipe.ingredients} auto-grow
                onIonChange={e => this.recipe = { ...this.recipe, ingredients: e.detail.value }}
                onKeyDown={e => this.onTextAreaKeyDown(e)} />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Directions</ion-label>
              <ion-textarea value={this.recipe.directions} auto-grow
                onIonChange={e => this.recipe = { ...this.recipe, directions: e.detail.value }}
                onKeyDown={e => this.onTextAreaKeyDown(e)} />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Storage/Freezer Instructions</ion-label>
              <ion-textarea value={this.recipe.storageInstructions} auto-grow
                onIonChange={e => this.recipe = { ...this.recipe, storageInstructions: e.detail.value }}
                onKeyDown={e => this.onTextAreaKeyDown(e)} />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Nutrition</ion-label>
              <ion-textarea value={this.recipe.nutritionInfo} auto-grow
                onIonChange={e => this.recipe = { ...this.recipe, nutritionInfo: e.detail.value }}
                onKeyDown={e => this.onTextAreaKeyDown(e)} />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Source</ion-label>
              <ion-input inputMode="url" value={this.recipe.sourceUrl} onIonChange={e => this.recipe = { ...this.recipe, sourceUrl: e.detail.value }} />
            </ion-item>
            <tags-input value={this.recipe.tags} suggestions={this.currentUserSettings?.favoriteTags ?? []}
              onValueChanged={e => this.recipe = { ...this.recipe, tags: e.detail }} />
          </form>
        </ion-content>
      </Host>
    );
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    dismissContainingModal(this.el, {
      recipe: this.recipe,
      file: this.imageInput?.value ? this.imageInput.files[0] : null
    });
  }

  private onCancelClicked() {
    dismissContainingModal(this.el);
  }

  private onTextAreaKeyDown(e: KeyboardEvent) {
    insertIfTabKey(e);
  }
}
