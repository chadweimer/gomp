import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { Recipe, UserSettings } from '../../generated';
import { loadUserSettings } from '../../helpers/api';
import { configureModalAutofocus, dismissContainingModal } from '../../helpers/utils';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css'
})
export class RecipeEditor {
  @Prop() recipe: Recipe = {
    name: '',
    servingSize: '',
    time: '',
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
            <ion-item lines="full">
              <ion-input label="Name" label-placement="stacked" value={this.recipe.name}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.recipe = { ...this.recipe, name: e.target.value as string }}
                required
                autofocus />
            </ion-item>
            {!this.recipe.id ?
              <ion-item lines="full">
                <form enctype="multipart/form-data">
                  <ion-label position="stacked">Picture</ion-label>
                  <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" ref={el => this.imageInput = el} />
                </form>
              </ion-item>
              : ''}
            <ion-item lines="full">
              <ion-input label="Serving Size" label-placement="stacked" value={this.recipe.servingSize}
                autocorrect="on"
                inputmode="numeric"
                spellcheck="true"
                onIonBlur={e => this.recipe = { ...this.recipe, servingSize: e.target.value as string }} />
            </ion-item>
            <ion-item lines="full">
              <ion-input label="Time" label-placement="stacked" value={this.recipe.time}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.recipe = { ...this.recipe, time: e.target.value as string }} />
            </ion-item>
            <ion-item lines="full">
              <ion-textarea label="Ingredients" label-placement="stacked" value={this.recipe.ingredients}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.recipe = { ...this.recipe, ingredients: e.target.value }}
                auto-grow />
            </ion-item>
            <ion-item lines="full">
              <ion-textarea label="Directions" label-placement="stacked" value={this.recipe.directions}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.recipe = { ...this.recipe, directions: e.target.value }}
                auto-grow />
            </ion-item>
            <ion-item lines="full">
              <ion-textarea label="Storage Instructions" label-placement="stacked" value={this.recipe.storageInstructions}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.recipe = { ...this.recipe, storageInstructions: e.target.value }}
                auto-grow />
            </ion-item>
            <ion-item lines="full">
              <ion-textarea label="Nutrition" label-placement="stacked" value={this.recipe.nutritionInfo}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.recipe = { ...this.recipe, nutritionInfo: e.target.value }}
                auto-grow />
            </ion-item>
            <ion-item lines="full">
              <ion-input label="Source" label-placement="stacked" value={this.recipe.sourceUrl}
                inputmode="url"
                onIonBlur={e => this.recipe = { ...this.recipe, sourceUrl: e.target.value as string }} />
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
}
