import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { Recipe, RecipeState, UserSettings } from '../../helpers/schema.gen';
import { api } from '../../helpers/api';
import { configureModalCanDismiss, getContainingModal } from '../../helpers/modals';
import { getRecipeImageUrl, getRecipeThumbnailUrl, isNull, toPresentationHtml, toStorageHtml } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import { HTMLEditor } from '../html-editor/html-editor';
import { InputCustomEvent } from '@ionic/core';

import '../html-editor/html-editor';
import '../tags-input/tags-input';

@customElement('recipe-editor')
export class RecipeEditor extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }
    `
  ];

  @property({ type: Object }) recipe: Recipe = {
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
    tags: [],
  };

  @property({ type: Array }) recipeImages: string[] = [];

  @state() private currentUserSettings: UserSettings | null = null;

  @query('form') private readonly form?: HTMLFormElement;
  @query('input[type="file"]') private readonly imageInput?: HTMLInputElement;
  @query('ion-input[label="Name"]') private readonly nameInput?: HTMLIonInputElement;
  @query('ion-input[label="Serving Size"]') private readonly servingSizeInput?: HTMLIonInputElement;
  @query('ion-input[label="Time"]') private readonly timeInput?: HTMLIonInputElement;
  @query('ion-input[label="Source"]') private readonly sourceUrlInput?: HTMLIonInputElement;
  @query('html-editor[id="ingredients"]') private readonly ingredientsInput?: HTMLEditor;
  @query('html-editor[id="directions"]') private readonly directionsInput?: HTMLEditor;
  @query('html-editor[id="storage-instructions"]') private readonly storageInput?: HTMLEditor;
  @query('html-editor[id="nutrition"]') private readonly nutritionInput?: HTMLEditor;

  private parentModal?: HTMLIonModalElement | null;

  override connectedCallback() {
    super.connectedCallback();
    const initialRecipe = { ...this.recipe };

    this.parentModal = getContainingModal(this);
    configureModalCanDismiss(this.parentModal, async (_data?: unknown, role?: string) => {
      if (role === 'save') {
        return false;
      }

      this.recipe = {
        ...this.recipe,
        name: (this.nameInput?.value ?? this.recipe?.name ?? '') as string,
        servingSize: (this.servingSizeInput?.value ?? this.recipe?.servingSize ?? '') as string,
        time: (this.timeInput?.value ?? this.recipe?.time ?? '') as string,
        sourceUrl: (this.sourceUrlInput?.value ?? this.recipe?.sourceUrl ?? '') as string,
        ingredients: toStorageHtml(this, (await this.ingredientsInput?.getValue?.()) ?? this.recipe?.ingredients ?? ''),
        directions: toStorageHtml(this, (await this.directionsInput?.getValue?.()) ?? this.recipe?.directions ?? ''),
        storageInstructions: toStorageHtml(this, (await this.storageInput?.getValue?.()) ?? this.recipe?.storageInstructions ?? ''),
        nutritionInfo: toStorageHtml(this, (await this.nutritionInput?.getValue?.()) ?? this.recipe?.nutritionInfo ?? ''),
      };

      return !this.areEqual(initialRecipe, this.recipe) || (this.imageInput?.files?.length ?? 0) > 0;
    });

    api.loadUserSettings().then(res => this.currentUserSettings = res, console.error);
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons slot="primary">
            <ion-button color="primary" @click=${() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>${isNull(this.recipe?.id) ? 'New Recipe' : 'Edit Recipe'}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" @click=${() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <form @submit=${(e: Event) => e.preventDefault()}>
          <ion-item lines="full">
            <ion-input
              label="Name"
              label-placement="stacked"
              .value=${this.recipe?.name}
              required
              autofocus
              @ionChange=${(e: InputCustomEvent) => this.recipe = { ...this.recipe, name: e.detail.value ?? '' }}
            ></ion-input>
          </ion-item>
          ${isNull(this.recipe?.id)
        ? html`
                <ion-item lines="full">
                  <form enctype="multipart/form-data">
                    <ion-label position="stacked">Picture</ion-label>
                    <input
                      name="file_content"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      class="ion-padding-vertical"
                    />
                  </form>
                </ion-item>
              `
        : nothing}
          <ion-item lines="full">
            <ion-input
              label="Serving Size"
              label-placement="stacked"
              .value=${this.recipe?.servingSize}
              @ionChange=${(e: InputCustomEvent) => this.recipe = { ...this.recipe, servingSize: e.detail.value ?? '' }}
            ></ion-input>
          </ion-item>
          <ion-item lines="full">
            <ion-input
              label="Time"
              label-placement="stacked"
              .value=${this.recipe?.time}
              @ionChange=${(e: InputCustomEvent) => this.recipe = { ...this.recipe, time: e.detail.value ?? '' }}
            ></ion-input>
          </ion-item>
          <ion-item class="force-overflow" lines="full">
            <ion-label position="stacked">Ingredients</ion-label>
            <html-editor
              id="ingredients"
              .value=${toPresentationHtml(this, this.recipe?.ingredients, this.recipe?.id, false)}
              @valueChanged=${(e: CustomEvent<string>) => this.recipe = { ...this.recipe, ingredients: toStorageHtml(this, e.detail) }}
            ></html-editor>
          </ion-item>
          <ion-item class="force-overflow" lines="full">
            <ion-label position="stacked">Directions</ion-label>
            <html-editor
              id="directions"
              .value=${toPresentationHtml(this, this.recipe?.directions, this.recipe?.id, false)}
              .images=${this.recipeImages.map((name) => ({
          name,
          url: getRecipeImageUrl(this.recipe?.id, name) ?? '',
          thumbUrl: getRecipeThumbnailUrl(this.recipe?.id, name) ?? '',
        }))}
              @valueChanged=${(e: CustomEvent<string>) => this.recipe = { ...this.recipe, directions: toStorageHtml(this, e.detail) }}
            ></html-editor>
          </ion-item>
          <ion-item lines="full">
            <ion-label position="stacked">Storage Instructions</ion-label>
            <html-editor
              id="storage-instructions"
              .value=${toPresentationHtml(this, this.recipe?.storageInstructions, this.recipe?.id, false)}
              @valueChanged=${(e: CustomEvent<string>) => this.recipe = { ...this.recipe, storageInstructions: toStorageHtml(this, e.detail) }}
            ></html-editor>
          </ion-item>
          <ion-item lines="full">
            <ion-label position="stacked">Nutrition</ion-label>
            <html-editor
              id="nutrition"
              .value=${toPresentationHtml(this, this.recipe?.nutritionInfo, this.recipe?.id, false)}
              @valueChanged=${(e: CustomEvent<string>) => this.recipe = { ...this.recipe, nutritionInfo: toStorageHtml(this, e.detail) }}
            ></html-editor>
          </ion-item>
          <ion-item lines="full">
            <ion-input
              label="Source"
              label-placement="stacked"
              .value=${this.recipe?.sourceUrl}
              inputmode="url"
              @ionChange=${(e: InputCustomEvent) => this.recipe = { ...this.recipe, sourceUrl: e.detail.value ?? '' }}
            ></ion-input>
          </ion-item>
          <ion-item lines="full">
            <tags-input
              label="Tags"
              label-placement="stacked"
              .value=${this.recipe?.tags ?? []}
              .suggestions=${this.currentUserSettings?.favoriteTags ?? []}
              @valueChanged=${(e: CustomEvent<string[]>) => (this.recipe = { ...this.recipe, tags: e.detail })}
            >
              <ion-input enterkeyhint="enter"></ion-input>
            </tags-input>
          </ion-item>
        </form>
      </ion-content>
    `;
  }

  private async onSaveClicked() {
    if (this.form && !this.form.reportValidity()) {
      return;
    }

    await this.parentModal?.dismiss(
      {
        recipe: this.recipe,
        file: (this.imageInput?.files?.length ?? 0) > 0 ? this.imageInput?.files?.[0] : null,
      },
      'save'
    );
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }

  private areEqual(a: Recipe, b: Recipe) {
    const aTags = [...(a.tags ?? [])].sort((x, y) => x.localeCompare(y));
    const bTags = [...(b.tags ?? [])].sort((x, y) => x.localeCompare(y));
    return (
      a.name === b.name &&
      a.directions === b.directions &&
      a.ingredients === b.ingredients &&
      a.nutritionInfo === b.nutritionInfo &&
      a.servingSize === b.servingSize &&
      a.sourceUrl === b.sourceUrl &&
      a.storageInstructions === b.storageInstructions &&
      a.time === b.time &&
      JSON.stringify(aTags) === JSON.stringify(bTags)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-editor': RecipeEditor;
  }
}
