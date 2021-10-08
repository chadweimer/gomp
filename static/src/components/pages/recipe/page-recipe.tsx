import { actionSheetController, alertController, loadingController, modalController } from '@ionic/core';
import { Component, Element, h, Host, Method, Prop, State } from '@stencil/core';
import { NotesApi, RecipesApi } from '../../../helpers/api';
import { formatDate, hasAccessLevel, redirect, showToast } from '../../../helpers/utils';
import { AccessLevel, Note, Recipe, RecipeImage, RecipeState } from '../../../models';
import state from '../../../store';

@Component({
  tag: 'page-recipe',
  styleUrl: 'page-recipe.css'
})
export class PageRecipe {
  @Prop() recipeId: number;

  @State() recipe: Recipe | null;
  @State() mainImage: RecipeImage | null;
  @State() images: RecipeImage[] = [];
  @State() notes: Note[] = [];

  @Element() el!: HTMLPageRecipeElement;

  async connectedCallback() {
    await this.load();
  }

  @Method()
  async activatedCallback() {
    await this.load();
  }

  render() {
    return (
      <Host>
        {hasAccessLevel(state.currentUser, AccessLevel.Editor) ?
          <ion-header class="ion-hide-lg-down">
            <ion-toolbar>
              <ion-buttons slot="primary">
                <ion-button onClick={() => this.onEditClicked()}>
                  <ion-icon slot="start" icon="create" />
                  Edit
                </ion-button>
                <ion-button onClick={() => this.onAddNoteClicked()}>
                  <ion-icon slot="start" icon="chatbox" />
                  Add Note
                </ion-button>
                <ion-button class="ion-hide-sm-down" onClick={() => this.onUploadImageClicked()}>
                  <ion-icon slot="start" icon="camera" />
                  Upload Picture
                </ion-button>
                <ion-button>
                  <ion-icon slot="start" icon="link" />
                  Add Link
                </ion-button>
              </ion-buttons>
              <ion-buttons slot="secondary">
                <ion-button onClick={() => this.onDeleteClicked()}>
                  <ion-icon slot="start" icon="trash" />
                  Delete
                </ion-button>
                {this.recipe?.state === RecipeState.Archived ?
                  <ion-button onClick={() => this.onUnarchiveClicked()}>
                    <ion-icon slot="start" icon="archive" />
                    Unarchive
                  </ion-button>
                  :
                  <ion-button onClick={() => this.onArchiveClicked()}>
                    <ion-icon slot="start" icon="archive" />
                    Archive
                  </ion-button>
                }
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          : ''}

        <ion-content>
          <ion-grid class="no-pad" fixed>
            <ion-row>
              <ion-col>
                <ion-card>
                  <ion-card-content>
                    <ion-item lines="none">
                      <ion-avatar slot="start" class="large">
                        <img src={this.mainImage?.thumbnailUrl} />
                      </ion-avatar>
                      <div>
                        <h1>{this.recipe?.name}</h1>
                        <five-star-rating value={this.recipe?.averageRating} disabled={!hasAccessLevel(state.currentUser, AccessLevel.Editor)}
                          onValueSelected={e => this.onRatingSelected(e)} />
                        <p><ion-note>{this.getRecipeDatesText(this.recipe?.createdAt, this.recipe?.modifiedAt)}</ion-note></p>
                      </div>
                    </ion-item>
                    {this.recipe?.servingSize ?
                      <ion-item lines="full">
                        <ion-label position="stacked">Serving Size</ion-label>
                        <p class="plain ion-padding">{this.recipe?.servingSize}</p>
                      </ion-item>
                      : ''}
                    {this.recipe?.ingredients ?
                      <ion-item lines="full">
                        <ion-label position="stacked">Ingredients</ion-label>
                        <p class="plain ion-padding">{this.recipe?.ingredients}</p>
                      </ion-item>
                      : ''}
                    {this.recipe?.directions ?
                      <ion-item lines="full">
                        <ion-label position="stacked">Directions</ion-label>
                        <p class="plain ion-padding">{this.recipe?.directions}</p>
                      </ion-item>
                      : ''}
                    {this.recipe?.storageInstructions ?
                      <ion-item lines="full">
                        <ion-label position="stacked">Storage/Freezer Instructions</ion-label>
                        <p class="plain ion-padding">{this.recipe?.storageInstructions}</p>
                      </ion-item>
                      : ''}
                    {this.recipe?.nutritionInfo ?
                      <ion-item lines="full">
                        <ion-label position="stacked">Nutrition</ion-label>
                        <p class="plain ion-padding">{this.recipe?.nutritionInfo}</p>
                      </ion-item>
                      : ''}
                    {this.recipe?.sourceUrl ?
                      <ion-item lines="full">
                        <ion-label position="stacked">Source</ion-label>
                        <p class="plain ion-padding">
                          <a href={this.recipe?.sourceUrl} target="_blank">{this.recipe?.sourceUrl}</a>
                        </p>
                      </ion-item>
                      : ''}
                    <div class="ion-padding-top">
                      {this.recipe?.tags?.map(tag =>
                        <ion-chip>{tag}</ion-chip>
                      )}
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="12" size-md>
                <h4 class="tab ion-text-center ion-margin-horizontal"><ion-text color="primary">Pictures</ion-text></h4>
                <ion-grid class="no-pad">
                  <ion-row class="ion-justify-content-center">
                    {this.images.map(image =>
                      <ion-col size="auto">
                        <ion-card>
                          <a href={image.url} target="_blank"><img class="thumb" src={image.thumbnailUrl} /></a>
                          {hasAccessLevel(state.currentUser, AccessLevel.Editor) ?
                            <ion-card-content class="ion-no-padding">
                              <ion-buttons>
                                <ion-button size="small" onClick={() => this.onSetMainImageClicked(image)}>
                                  <ion-icon slot="icon-only" icon="star" size="small" />
                                </ion-button>
                                <ion-button size="small" color="danger" onClick={() => this.onDeleteImageClicked(image)}>
                                  <ion-icon slot="icon-only" icon="trash" size="small" />
                                </ion-button>
                              </ion-buttons>
                            </ion-card-content>
                            : ''}
                        </ion-card>
                      </ion-col>
                    )}
                  </ion-row>
                </ion-grid>
              </ion-col>
              <ion-col size="12" size-md>
                <h4 class="tab ion-text-center ion-margin-horizontal"><ion-text color="primary">Notes</ion-text></h4>
                <ion-grid>
                  {this.notes.map(note =>
                    <ion-row>
                      <ion-col>
                        <ion-card>
                          <ion-card-header>
                            <ion-item lines="full">
                              <ion-icon slot="start" icon="chatbox" />
                              <ion-label>{this.getNoteDatesText(note.createdAt, note.modifiedAt)}</ion-label>
                              {hasAccessLevel(state.currentUser, AccessLevel.Editor) ?
                                <ion-buttons slot="end">
                                  <ion-button size="small" color="warning" onClick={() => this.onEditNoteClicked(note)}>
                                    <ion-icon slot="icon-only" icon="create" size="small" />
                                  </ion-button>
                                  <ion-button size="small" color="danger" onClick={() => this.onDeleteNoteClicked(note)}>
                                    <ion-icon slot="icon-only" icon="trash" size="small" />
                                  </ion-button>
                                </ion-buttons>
                                : ''}
                            </ion-item>
                          </ion-card-header>
                          <ion-card-content>
                            <p class="plain">{note.text}</p>
                          </ion-card-content>
                        </ion-card>
                      </ion-col>
                    </ion-row>
                  )}
                </ion-grid>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>

        {hasAccessLevel(state.currentUser, AccessLevel.Editor) ?
          <ion-footer class="ion-hide-lg-up">
            <ion-toolbar>
              <ion-buttons slot="primary">
                <ion-button onClick={() => this.onEditClicked()}>
                  <ion-icon slot="start" icon="create" />
                  Edit
                </ion-button>
                <ion-button onClick={() => this.onAddNoteClicked()}>
                  <ion-icon slot="start" icon="chatbox" />
                  Add Note
                </ion-button>
                <ion-button class="ion-hide-sm-down" onClick={() => this.onUploadImageClicked()}>
                  <ion-icon slot="start" icon="camera" />
                  Upload Picture
                </ion-button>
                <ion-button class="ion-hide-md-down">
                  <ion-icon slot="start" icon="link" />
                  Add Link
                </ion-button>
                <ion-button onClick={() => this.onRecipeMenuClicked()}>
                  <ion-icon slot="icon-only" ios="ellipsis-horizontal" md="ellipsis-vertical" />
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-footer>
          : ''}
      </Host>
    );
  }

  private getRecipeDatesText(createdAt: string, modifiedAt: string) {
    if (createdAt !== modifiedAt) {
      return (
        <span>
          <span class="ion-text-nowrap">Created: {formatDate(createdAt)}</span>, <span class="ion-text-nowrap">Last Modified: {formatDate(modifiedAt)}</span>
        </span>
      );
    }
    return (
      <span class="ion-text-nowrap">Created: {formatDate(createdAt)}</span>
    );
  }

  private getNoteDatesText(createdAt: string, modifiedAt: string) {
    if (createdAt !== modifiedAt) {
      return (
        <span>
          <span class="ion-text-nowrap">{formatDate(createdAt)}</span> <span class="ion-text-nowrap">(edited: {formatDate(modifiedAt)})</span>
        </span>
      );
    }
    return (
      <span class="ion-text-nowrap">{formatDate(createdAt)}</span>
    );
  }

  private async load() {
    await this.loadRecipe();
    await this.loadImages();
    await this.loadNotes();
  }

  private async loadRecipe() {
    try {
      const { recipe, mainImage } = await RecipesApi.get(this.el, this.recipeId);
      this.recipe = recipe;
      this.mainImage = mainImage;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveRecipe(recipe: Recipe) {
    try {
      await RecipesApi.put(this.el, recipe);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe.');
    }
  }

  private async loadImages() {
    try {
      this.images = await RecipesApi.getImages(this.el, this.recipeId);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async loadNotes() {
    try {
      this.notes = await RecipesApi.getNotes(this.el, this.recipeId);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async deleteRecipe() {
    try {
      await RecipesApi.delete(this.el, this.recipeId);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete recipe.');
    }
  }

  private async setRecipeState(state: RecipeState) {
    try {
      await RecipesApi.putState(this.el, this.recipeId, state);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe state.');
    }
  }

  private async saveNewNote(note: Note) {
    note = {
      ...note,
      recipeId: this.recipeId
    };
    try {
      await NotesApi.post(this.el, note);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create note.');
    }
  }

  private async saveExistingNote(note: Note) {
    try {
      await NotesApi.put(this.el, note);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save note.');
    }
  }

  private async deleteNote(note: Note) {
    try {
      await NotesApi.delete(this.el, note.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete note.');
    }
  }

  private async uploadImage(formData: FormData) {
    try {
      const loading = await loadingController.create({
        message: 'Uploading picture...',
        animated: false,
      });
      await loading.present();

      await RecipesApi.postImage(this.el, this.recipeId, formData);
      await loading.dismiss();
    } catch (ex) {
      console.error(ex);
      showToast('Failed to upload picture.');
    }
  }

  private async deleteImage(image: RecipeImage) {
    try {
      await RecipesApi.deleteImage(this.el, this.recipeId, image.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete image.');
    }
  }

  private async setRating(value: number) {
    try {
      await RecipesApi.putRating(this.el, this.recipeId, value);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe rating.');
    }
  }

  private async setMainImage(image: RecipeImage) {
    try {
      await RecipesApi.putMainImage(this.el, this.recipeId, image.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to set main picture.');
    }
  }

  private async onRecipeMenuClicked() {
    window.history.pushState({ modal: true }, '');

    const menu = await actionSheetController.create({
      header: 'Menu',
      buttons: [
        {
          text: 'Delete',
          icon: 'trash',
          role: 'destructive',
          handler: async () => {
            await this.onDeleteClicked();
            return true;
          }
        },
        {
          text: this.recipe?.state === RecipeState.Archived ? 'Unarchive' : 'Archive',
          icon: 'archive',
          handler: async () => {
            if (this.recipe.state === RecipeState.Archived) {
              await this.onUnarchiveClicked();
            } else {
              await this.onArchiveClicked();
            }
            return true;
          }
        },
        { text: 'Add Link', icon: 'link' },
        {
          text: 'Upload Picture',
          icon: 'camera',
          handler: async () => {
            this.onUploadImageClicked();
            return true;
          }
        },
        {
          text: 'Add Note',
          icon: 'chatbox',
          handler: async () => {
            await this.onAddNoteClicked();
            return true;
          }
        },
        {
          text: 'Edit',
          icon: 'create',
          handler: async () => {
            await this.onEditClicked();
            return true;
          }
        },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ],
      animated: false,
    });
    await menu.present();
  }

  private async onEditClicked() {
    window.history.pushState({ modal: true }, '');

    const modal = await modalController.create({
      component: 'recipe-editor',
      animated: false,
    });
    await modal.present();

    // Workaround for auto-grow textboxes in a dialog.
    // Set this only after the dialog has presented,
    // instead of using component props
    modal.querySelector('recipe-editor').recipe = this.recipe;

    const resp = await modal.onDidDismiss<{ dismissed: boolean, recipe: Recipe }>();
    if (resp.data?.dismissed === false) {
      await this.saveRecipe({
        ...this.recipe,
        ...resp.data.recipe
      });
      await this.loadRecipe();
    }
  }

  private async onDeleteClicked() {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Delete Recipe?',
      message: 'Are you sure you want to delete this recipe?',
      buttons: [
        'No',
        {
          text: 'Yes',
          role: 'yes',
          handler: async () => {
            await this.deleteRecipe();
            return true;
          }
        }
      ],
      animated: false,
    });

    await confirmation.present();

    const { role } = await confirmation.onDidDismiss();
    if (role === 'yes') {
      await redirect('/recipes');
    }
  }

  private async onArchiveClicked() {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Arhive Recipe?',
      message: 'Are you sure you want to archive this recipe?',
      buttons: [
        'No',
        {
          text: 'Yes',
          role: 'yes',
          handler: async () => {
            await this.setRecipeState(RecipeState.Archived);
            await this.loadRecipe();
            return true;
          }
        }
      ],
      animated: false,
    });

    await confirmation.present();
  }

  private async onUnarchiveClicked() {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Unarchive Recipe?',
      message: 'Are you sure you want to unarchive this recipe?',
      buttons: [
        'No',
        {
          text: 'Yes',
          role: 'yes',
          handler: async () => {
            await this.setRecipeState(RecipeState.Active);
            await this.loadRecipe();
            return true;
          }
        },
      ],
      animated: false,
    });

    await confirmation.present();
  }

  private async onAddNoteClicked() {
    window.history.pushState({ modal: true }, '');

    const modal = await modalController.create({
      component: 'note-editor',
      animated: false,
    });
    await modal.present();

    const resp = await modal.onDidDismiss<{ dismissed: boolean, note: Note }>();
    if (resp.data?.dismissed === false) {
      await this.saveNewNote(resp.data.note);
      await this.loadNotes();
    }
  }

  private async onEditNoteClicked(note: Note | null) {
    window.history.pushState({ modal: true }, '');

    const modal = await modalController.create({
      component: 'note-editor',
      animated: false,
    });
    await modal.present();

    // Workaround for auto-grow textboxes in a dialog.
    // Set this only after the dialog has presented,
    // instead of using component props
    modal.querySelector('note-editor').note = note;

    const resp = await modal.onDidDismiss<{ dismissed: boolean, note: Note }>();
    if (resp.data?.dismissed === false) {
      await this.saveExistingNote({
        ...note,
        ...resp.data.note
      });
      await this.loadNotes();
    }
  }

  private async onDeleteNoteClicked(note: Note) {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Delete Note?',
      message: 'Are you sure you want to delete this note?',
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.deleteNote(note);
            await this.loadNotes();
            return true;
          }
        }
      ],
      animated: false,
    });

    await confirmation.present();
  }

  private async onUploadImageClicked() {
    window.history.pushState({ modal: true }, '');

    const modal = await modalController.create({
      component: 'image-upload-browser',
      animated: false,
    });
    await modal.present();

    const resp = await modal.onDidDismiss<{ dismissed: boolean, formData: FormData }>();
    if (resp.data?.dismissed === false) {
      await this.uploadImage(resp.data.formData);
      await this.loadRecipe();
      await this.loadImages();
    }
  }

  private async onRatingSelected(e: CustomEvent<number>) {
    await this.setRating(e.detail);
    await this.loadRecipe();
  }

  private async onSetMainImageClicked(image: RecipeImage) {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Set Main Picture?',
      message: 'Are you sure you want to this as the main picture for the recipe?',
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.setMainImage(image);
            await this.loadRecipe();
            return true;
          }
        }
      ],
      animated: false,
    });

    await confirmation.present();
  }

  private async onDeleteImageClicked(image: RecipeImage) {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Delete Image?',
      message: 'Are you sure you want to delete this picture?',
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.deleteImage(image);
            await this.loadImages();
            return true;
          }
        }
      ],
      animated: false,
    });

    await confirmation.present();
  }
}
