import { actionSheetController, alertController, modalController } from '@ionic/core';
import { Component, Element, h, Host, Method, Prop, State } from '@stencil/core';
import { AccessLevel, Note, Recipe, RecipeCompact, RecipeImage, RecipeState } from '../../../generated';
import { recipesApi } from '../../../helpers/api';
import { enableBackForOverlay, formatDate, hasAccessLevel, redirect, showLoading, showToast } from '../../../helpers/utils';
import state, { refreshSearchResults } from '../../../stores/state';

@Component({
  tag: 'page-recipe',
  styleUrl: 'page-recipe.css'
})
export class PageRecipe {
  @Prop() recipeId: number;

  @State() recipe: Recipe | null;
  @State() mainImage: RecipeImage | null;
  @State() recipeRating: number | null;
  @State() links: RecipeCompact[] = [];
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
                <ion-button onClick={() => this.onAddLinkClicked()}>
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
                      {this.mainImage ?
                        <a class="ion-margin-end" href={this.mainImage.url} target="_blank">
                          <ion-avatar slot="start" class="large">
                            <img src={this.mainImage.thumbnailUrl} />
                          </ion-avatar>
                        </a>
                        : ''}
                      <div>
                        <h1>{this.recipe?.name}</h1>
                        <five-star-rating value={this.recipeRating} disabled={!hasAccessLevel(state.currentUser, AccessLevel.Editor)}
                          onValueSelected={e => this.onRatingSelected(e)} />
                        <p><ion-note>{this.getRecipeDatesText(this.recipe?.createdAt, this.recipe?.modifiedAt)}</ion-note></p>
                      </div>
                      {this.recipe?.state === RecipeState.Archived
                        ? <ion-badge class="top-right opacity-75 send-to-back" color="medium">Archived</ion-badge>
                        : ''}
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
                    {this.links?.length > 0 ?
                      <ion-item lines="full">
                        <ion-label position="stacked">Related Recipes</ion-label>
                        <div class="ion-padding-top fill">
                          {this.links.map(link =>
                            <ion-item lines="none">
                              <ion-avatar slot="start">
                                {link.thumbnailUrl ? <img src={link.thumbnailUrl} /> : ''}
                              </ion-avatar>
                              <ion-label>
                                <ion-router-link href={`/recipes/${link.id}`} color="dark">
                                  {link.name}
                                </ion-router-link>
                              </ion-label>
                              <ion-button slot="end" fill="clear" color="danger" onClick={() => this.onDeleteLinkClicked(link)}>
                                <ion-icon slot="icon-only" icon="close-circle" />
                              </ion-button>
                            </ion-item>
                          )}
                        </div>
                      </ion-item>
                      : ''}
                    <div class="ion-margin-top">
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
                    {this.images?.map(image =>
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
                  {this.notes?.map(note =>
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
                <ion-button class="ion-hide-md-down" onClick={() => this.onAddLinkClicked()}>
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
    await this.loadRating();
    await this.loadLinks();
    await this.loadMainImage();
    await this.loadImages();
    await this.loadNotes();
  }

  private async loadRecipe() {
    try {
      ({ data: this.recipe } = await recipesApi.getRecipe(this.recipeId));
    } catch (ex) {
      this.recipe = null;
      console.error(ex);
    }
  }

  private async loadRating() {
    try {
      ({ data: this.recipeRating } = await recipesApi.getRating(this.recipeId));
    } catch (ex) {
      this.recipeRating = null;
      console.error(ex);
    }
  }

  private async loadLinks() {
    try {
      ({ data: this.links } = await recipesApi.getLinks(this.recipeId));
    } catch (ex) {
      this.links = [];
      console.error(ex);
    }
  }

  private async loadImages() {
    try {
      ({ data: this.images } = await recipesApi.getImages(this.recipeId));
    } catch (ex) {
      this.images = [];
      console.error(ex);
    }
  }

  private async loadMainImage() {
    try {
      ({ data: this.mainImage } = await recipesApi.getMainImage(this.recipeId));
    } catch (ex) {
      this.mainImage = null;
      console.error(ex);
    }
  }

  private async loadNotes() {
    try {
      ({ data: this.notes } = await recipesApi.getNotes(this.recipeId));
    } catch (ex) {
      this.notes = [];
      console.error(ex);
    }
  }

  private async saveRecipe(recipe: Recipe) {
    try {
      await recipesApi.saveRecipe(this.recipeId, recipe);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe.');
    }
  }

  private async deleteRecipe() {
    try {
      await recipesApi.deleteRecipe(this.recipeId);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete recipe.');
    }
  }

  private async setRecipeState(state: RecipeState) {
    try {
      await recipesApi.setState(this.recipeId, state);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe state.');
    }
  }

  private async addLink(recipeId: number) {
    try {
      await recipesApi.addLink(this.recipeId, recipeId);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to add linked recipe.');
    }
  }

  private async deleteLink(link: RecipeCompact) {
    try {
      await recipesApi.deleteLink(this.recipeId, link.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to remove linked recipe.');
    }
  }

  private async saveNewNote(note: Note) {
    try {
      await recipesApi.addNote(this.recipeId, note);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create note.');
    }
  }

  private async saveExistingNote(note: Note) {
    try {
      await recipesApi.saveNote(this.recipeId, note.id, note);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save note.');
    }
  }

  private async deleteNote(note: Note) {
    try {
      await recipesApi.deleteNote(this.recipeId, note.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete note.');
    }
  }

  private async uploadImage(file: File) {
    try {
      await showLoading(
        async () => {
          await recipesApi.uploadImage(this.recipeId, file);
        },
        'Uploading picture...');
    } catch (ex) {
      console.error(ex);
      showToast('Failed to upload picture.');
    }
  }

  private async deleteImage(image: RecipeImage) {
    try {
      await recipesApi.deleteImage(this.recipeId, image.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete image.');
    }
  }

  private async setRating(value: number) {
    try {
      await recipesApi.setRating(this.recipeId, value);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe rating.');
    }
  }

  private async setMainImage(image: RecipeImage) {
    try {
      await recipesApi.setMainImage(this.recipeId, image.id);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to set main picture.');
    }
  }

  private async onRecipeMenuClicked() {
    const menu = await actionSheetController.create({
      header: 'Menu',
      buttons: [
        { text: 'Delete', icon: 'trash', role: 'destructive' },
        {
          text: this.recipe?.state === RecipeState.Archived ? 'Unarchive' : 'Archive',
          icon: 'archive',
          role: 'archive'
        },
        { text: 'Add Link', icon: 'link', role: 'link' },
        { text: 'Upload Picture', icon: 'camera', role: 'image' },
        { text: 'Add Note', icon: 'chatbox', role: 'note' },
        { text: 'Edit', icon: 'create', role: 'edit' },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ],
      animated: false,
    });
    await menu.present();

    const { role } = await menu.onDidDismiss();

    switch (role) {
      case 'destructive':
        await this.onDeleteClicked();
        break;
      case 'archive':
        if (this.recipe.state === RecipeState.Archived) {
          await this.onUnarchiveClicked();
        } else {
          await this.onArchiveClicked();
        }
        break;
      case 'link':
        await this.onAddLinkClicked();
        break;
      case 'image':
        await this.onUploadImageClicked();
        break;
      case 'note':
        await this.onAddNoteClicked();
        break;
      case 'edit':
        await this.onEditClicked();
        break;
    }
  }

  private async onEditClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'recipe-editor',
        animated: false,
        backdropDismiss: false,
      });
      await modal.present();

      // Workaround for auto-grow textboxes in a dialog.
      // Set this only after the dialog has presented,
      // instead of using component props
      modal.querySelector('recipe-editor').recipe = this.recipe;

      const { data } = await modal.onDidDismiss<{ recipe: Recipe }>();
      if (data) {
        await this.saveRecipe({
          ...this.recipe,
          ...data.recipe
        });
        await this.loadRecipe();

        // Update the search results since the modified recipe may be in them,
        // but don't change the scroll position or page number
        await refreshSearchResults(false);
      }
    });
  }

  private async onDeleteClicked() {
    await enableBackForOverlay(async () => {
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
        // Update the search results since the modified recipe may be in them,
        // but don't change the scroll position or page number
        await refreshSearchResults(false);

        await redirect('/search');
      }
    });
  }

  private async onArchiveClicked() {
    await enableBackForOverlay(async () => {
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

      const { role } = await confirmation.onDidDismiss();
      if (role === 'yes') {
        // Update the search results since the modified recipe may be in them,
        // but don't change the scroll position or page number
        await refreshSearchResults(false);
      }
    });
  }

  private async onUnarchiveClicked() {
    await enableBackForOverlay(async () => {
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

      const { role } = await confirmation.onDidDismiss();
      if (role === 'yes') {
        // Update the search results since the modified recipe may be in them,
        // but don't change the scroll position or page number
        await refreshSearchResults(false);
      }
    });
  }

  private async onAddLinkClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'recipe-link-editor',
        componentProps: {
          parentRecipeId: this.recipeId
        },
        animated: false,
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ recipeId: number }>();
      if (data) {
        await this.addLink(data.recipeId);
        await this.loadLinks();
      }
    });
  }

  private async onDeleteLinkClicked(link: RecipeCompact) {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Remove Link?',
        message: `Are you sure you want to remove the linked recipe '${link.name}'?`,
        buttons: [
          'No',
          {
            text: 'Yes',
            role: 'yes',
            handler: async () => {
              await this.deleteLink(link);
              await this.loadLinks();
              return true;
            }
          },
        ],
        animated: false,
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

  private async onAddNoteClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'note-editor',
        animated: false,
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ note: Note }>();
      if (data) {
        await this.saveNewNote(data.note);
        await this.loadNotes();
      }
    });
  }

  private async onEditNoteClicked(note: Note) {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'note-editor',
        animated: false,
        backdropDismiss: false,
      });
      await modal.present();

      // Workaround for auto-grow textboxes in a dialog.
      // Set this only after the dialog has presented,
      // instead of using component props
      modal.querySelector('note-editor').note = note;

      const { data } = await modal.onDidDismiss<{ note: Note }>();
      if (data) {
        await this.saveExistingNote({
          ...note,
          ...data.note
        });
        await this.loadNotes();
      }
    });
  }

  private async onDeleteNoteClicked(note: Note) {
    await enableBackForOverlay(async () => {
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

      await confirmation.onDidDismiss();
    });
  }

  private async onUploadImageClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'image-upload-browser',
        animated: false,
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ file: File }>();
      if (data) {
        await this.uploadImage(data.file);
        await this.loadMainImage();
        await this.loadImages();

        // Update the search results since the modified recipe may be in them,
        // but don't change the scroll position or page number
        await refreshSearchResults(false);
      }
    });
  }

  private async onRatingSelected(e: CustomEvent<number>) {
    await this.setRating(e.detail);
    await this.loadRating();

    // Update the search results since the modified recipe may be in them,
    // but don't change the scroll position or page number
    await refreshSearchResults(false);
  }

  private async onSetMainImageClicked(image: RecipeImage) {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Set Main Picture?',
        message: 'Are you sure you want to this as the main picture for the recipe?',
        buttons: [
          'No',
          {
            text: 'Yes',
            role: 'yes',
            handler: async () => {
              await this.setMainImage(image);
              await this.loadMainImage();
              return true;
            }
          }
        ],
        animated: false,
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();
      if (role === 'yes') {
        // Update the search results since the modified recipe may be in them,
        // but don't change the scroll position or page number
        await refreshSearchResults(false);
      }
    });
  }

  private async onDeleteImageClicked(image: RecipeImage) {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Delete Image?',
        message: 'Are you sure you want to delete this picture?',
        buttons: [
          'No',
          {
            text: 'Yes',
            role: 'yes',
            handler: async () => {
              await this.deleteImage(image);
              await this.loadMainImage();
              await this.loadImages();
              return true;
            }
          }
        ],
        animated: false,
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();
      if (role === 'yes') {
        // Update the search results since the modified recipe may be in them,
        // but don't change the scroll position or page number
        await refreshSearchResults(false);
      }
    });
  }
}
