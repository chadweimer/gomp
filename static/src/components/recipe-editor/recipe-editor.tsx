import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { Recipe, RecipeState, UserSettings } from '../../helpers/schema.gen';
import { api } from '../../helpers/api';
import { configureModalCanDismiss, getContainingModal } from '../../helpers/modals';
import { getRecipeThumbnailUrl, isNull, toPresentationHtml, toStorageHtml, trap } from '../../helpers/utils';

@Component({
  tag: 'recipe-editor',
  styleUrl: 'recipe-editor.css',
  shadow: true,
})
export class RecipeEditor {
  @Prop() recipe: Recipe = {
    name: '',
    state: RecipeState.Active,
    rating: 0,
    servingSize: '',
    time: '',
    nutritionInfo: '',
    ingredients: '',
    directions: '',
    storageInstructions: '',
    sourceUrl: '',
    mainImageName: '',
    tags: []
  };
  @Prop() recipeImages: string[] = [];

  @State() currentUserSettings: UserSettings | null = null;

  @Element() el!: HTMLRecipeEditorElement;
  private form!: HTMLFormElement;
  private imageInput?: HTMLInputElement;
  private nameInput!: HTMLIonInputElement;
  private servingSizeInput!: HTMLIonInputElement;
  private timeInput!: HTMLIonInputElement;
  private sourceUrlInput!: HTMLIonInputElement;
  private ingredientsInput!: HTMLHtmlEditorElement;
  private directionsInput!: HTMLHtmlEditorElement;
  private storageInput!: HTMLHtmlEditorElement;
  private nutritionInput!: HTMLHtmlEditorElement;
  private parentModal?: HTMLIonModalElement | null;

  async connectedCallback() {
    const initialRecipe = { ...this.recipe };

    this.parentModal = getContainingModal(this.el);
    configureModalCanDismiss(this.parentModal, async (_data?: unknown, role?: string) => {
      if (role === 'save') {
        return false;
      }

      // A blur event is not always guaranteed (e.g., if the user clicked the browser back button)
      this.recipe = {
        ...this.recipe,
        name: this.nameInput.value as string,
        servingSize: this.servingSizeInput.value as string,
        time: this.timeInput.value as string,
        sourceUrl: this.sourceUrlInput.value as string,
        ingredients: toStorageHtml(this.el, await this.ingredientsInput.getValue()),
        directions: toStorageHtml(this.el, await this.directionsInput.getValue()),
        storageInstructions: toStorageHtml(this.el, await this.storageInput.getValue()),
        nutritionInfo: toStorageHtml(this.el, await this.nutritionInput.getValue()),
      }

      return !this.areEqual(initialRecipe, this.recipe) || (this.imageInput?.files?.length ?? 0) > 0;
    });

    this.currentUserSettings = await trap(api.loadUserSettings, null);
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{isNull(this.recipe?.id) ? 'New Recipe' : 'Edit Recipe'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el!}>
            <ion-item lines="full">
              <ion-input label="Name" label-placement="stacked" value={this.recipe?.name}
                autocorrect="on"
                spellcheck
                required
                autofocus
                onIonChange={e => this.recipe = { ...this.recipe, name: e.detail.value as string }}
                ref={el => this.nameInput = el!} />
            </ion-item>
            {isNull(this.recipe?.id) &&
              <ion-item lines="full">
                <form enctype="multipart/form-data">
                  <ion-label position="stacked">Picture</ion-label>
                  <input name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" ref={el => this.imageInput = el!} />
                </form>
              </ion-item>
            }
            <ion-item lines="full">
              <ion-input label="Serving Size" label-placement="stacked" value={this.recipe?.servingSize}
                autocorrect="on"
                spellcheck
                onIonChange={e => this.recipe = { ...this.recipe, servingSize: e.detail.value as string }}
                ref={el => this.servingSizeInput = el!} />
            </ion-item>
            <ion-item lines="full">
              <ion-input label="Time" label-placement="stacked" value={this.recipe?.time}
                autocorrect="on"
                spellcheck
                onIonChange={e => this.recipe = { ...this.recipe, time: e.detail.value as string }}
                ref={el => this.timeInput = el!} />
            </ion-item>
            <ion-item class="force-overflow" lines="full">
              <html-editor label="Ingredients" label-placement="stacked"
                enableHeadings={false}
                enableLinks={false}
                enableAlignment={false}
                enableLists={true}
                value={toPresentationHtml(this.el, this.recipe?.ingredients, this.recipe?.id, false)}
                onValueChanged={e => this.recipe = { ...this.recipe, ingredients: toStorageHtml(this.el, e.detail) }}
                ref={el => this.ingredientsInput = el!} />
            </ion-item>
            <ion-item class="force-overflow" lines="full">
              <html-editor label="Directions" label-placement="stacked"
                enableHeadings={true}
                enableLinks={true}
                enableAlignment={true}
                enableLists={true}
                value={toPresentationHtml(this.el, this.recipe?.directions, this.recipe?.id, false)}
                images={this.recipeImages.map(name => ({ name, url: getRecipeThumbnailUrl(this.recipe?.id, name) }))}
                onValueChanged={e => this.recipe = { ...this.recipe, directions: toStorageHtml(this.el, e.detail) }}
                ref={el => this.directionsInput = el!} />
            </ion-item>
            <ion-item lines="full">
              <html-editor label="Storage Instructions" label-placement="stacked"
                enableHeadings={false}
                enableLinks={false}
                enableAlignment={false}
                enableLists={false}
                value={toPresentationHtml(this.el, this.recipe?.storageInstructions, this.recipe?.id, false)}
                onValueChanged={e => this.recipe = { ...this.recipe, storageInstructions: toStorageHtml(this.el, e.detail) }}
                ref={el => this.storageInput = el!} />
            </ion-item>
            <ion-item lines="full">
              <html-editor label="Nutrition" label-placement="stacked"
                enableHeadings={false}
                enableLinks={false}
                enableAlignment={false}
                enableLists={false}
                value={toPresentationHtml(this.el, this.recipe?.nutritionInfo, this.recipe?.id, false)}
                onValueChanged={e => this.recipe = { ...this.recipe, nutritionInfo: toStorageHtml(this.el, e.detail) }}
                ref={el => this.nutritionInput = el!} />
            </ion-item>
            <ion-item lines="full">
              <ion-input label="Source" label-placement="stacked" value={this.recipe?.sourceUrl}
                inputmode="url"
                onIonChange={e => this.recipe = { ...this.recipe, sourceUrl: e.detail.value as string }}
                ref={el => this.sourceUrlInput = el!} />
            </ion-item>
            <ion-item lines="full">
              <tags-input label="Tags" label-placement="stacked" value={this.recipe?.tags}
                suggestions={this.currentUserSettings?.favoriteTags ?? []}
                onValueChanged={e => this.recipe = { ...this.recipe, tags: e.detail }}>
                <ion-input enterkeyhint="enter" />
              </tags-input>
            </ion-item>
          </form>
        </ion-content>
      </Host>
    );
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    await this.parentModal?.dismiss({
      recipe: this.recipe,
      file: (this.imageInput?.files?.length ?? 0) > 0 ? this.imageInput?.files?.[0] : null
    }, 'save');
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }

  private areEqual(a: Recipe, b: Recipe) {
    return a.name === b.name &&
      a.directions === b.directions &&
      a.ingredients === b.ingredients &&
      a.nutritionInfo === b.nutritionInfo &&
      a.servingSize === b.servingSize &&
      a.sourceUrl === b.sourceUrl &&
      a.storageInstructions === b.storageInstructions &&
      a.time === b.time &&
      JSON.stringify(a.tags?.toSorted((a, b) => a.localeCompare(b))) === JSON.stringify(b.tags?.toSorted((a, b) => a.localeCompare(b)));
  }
}
