import { actionSheetController, alertController, modalController } from '@ionic/core';
import { Component, Element, h, Host, Method, Prop, State } from '@stencil/core';
import { AccessLevel, Note, Recipe, RecipeCompact, RecipeImage, RecipeState } from '../../../generated';
import { recipesApi, refreshSearchResults } from '../../../helpers/api';
import { enableBackForOverlay, hasScope, isNull, redirect, showLoading, showToast } from '../../../helpers/utils';
import state from '../../../stores/state';
import { getDefaultSearchFilter } from '../../../models';

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
        {hasScope(state.jwtToken, AccessLevel.Editor) ?
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
                <recipe-viewer
                  recipe={this.recipe}
                  rating={this.recipeRating}
                  mainImage={this.mainImage}
                  links={this.links}
                  readonly={!hasScope(state.jwtToken, AccessLevel.Editor)}
                  onRatingSelected={e => this.onRatingSelected(e.detail)}
                  onDeleteLinkClicked={e => this.onDeleteLinkClicked(e.detail)}
                  onTagClicked={e => this.onTagClicked(e.detail)} />
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="12" size-md>
                <h4 class="tab ion-text-center ion-margin-horizontal"><ion-text color="primary">Pictures</ion-text></h4>
                <ion-grid class="no-pad">
                  <ion-row class="ion-justify-content-center">
                    {this.images?.map(image =>
                      <ion-col key={image.id} size="auto">
                        <ion-card>
                          <a href={image.url} target="_blank" rel="noopener noreferrer"><img alt={image.url} class="thumb" src={image.thumbnailUrl} /></a>
                          {hasScope(state.jwtToken, AccessLevel.Editor) ?
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
                    <ion-row key={note.id}>
                      <ion-col>
                        <note-card
                          note={note}
                          readonly={!hasScope(state.jwtToken, AccessLevel.Editor)}
                          onEditClicked={e => this.onEditNoteClicked(e.detail)}
                          onDeleteClicked={e => this.onDeleteNoteClicked(e.detail)} />
                      </ion-col>
                    </ion-row>
                  )}
                </ion-grid>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>

        {hasScope(state.jwtToken, AccessLevel.Editor) ?
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
      this.recipe = await recipesApi.getRecipe({
        recipeId: this.recipeId
      });
    } catch (ex) {
      this.recipe = null;
      console.error(ex);
    }
  }

  private async loadRating() {
    try {
      this.recipeRating = await recipesApi.getRating({
        recipeId: this.recipeId
      });
    } catch (ex) {
      this.recipeRating = null;
      console.error(ex);
    }
  }

  private async loadLinks() {
    try {
      this.links = await recipesApi.getLinks({
        recipeId: this.recipeId
      });
    } catch (ex) {
      this.links = [];
      console.error(ex);
    }
  }

  private async loadImages() {
    try {
      this.images = await recipesApi.getImages({
        recipeId: this.recipeId
      });
    } catch (ex) {
      this.images = [];
      console.error(ex);
    }
  }

  private async loadMainImage() {
    try {
      this.mainImage = await recipesApi.getMainImage({
        recipeId: this.recipeId
      });
    } catch (ex) {
      this.mainImage = null;
      console.error(ex);
    }
  }

  private async loadNotes() {
    try {
      this.notes = await recipesApi.getNotes({
        recipeId: this.recipeId
      });
    } catch (ex) {
      this.notes = [];
      console.error(ex);
    }
  }

  private async saveRecipe(recipe: Recipe) {
    try {
      await recipesApi.saveRecipe({
        recipeId: this.recipeId,
        recipe: recipe
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe.');
    }
  }

  private async deleteRecipe() {
    try {
      await recipesApi.deleteRecipe({
        recipeId: this.recipeId
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete recipe.');
    }
  }

  private async setRecipeState(state: RecipeState) {
    try {
      await recipesApi.setState({
        recipeId: this.recipeId,
        state: state
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe state.');
    }
  }

  private async addLink(recipeId: number) {
    try {
      await recipesApi.addLink({
        recipeId: this.recipeId,
        destRecipeId: recipeId
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to add linked recipe.');
    }
  }

  private async deleteLink(link: RecipeCompact) {
    try {
      await recipesApi.deleteLink({
        recipeId: this.recipeId,
        destRecipeId: link.id
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to remove linked recipe.');
    }
  }

  private async saveNewNote(note: Note) {
    try {
      await recipesApi.addNote({
        recipeId: this.recipeId,
        note: note
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create note.');
    }
  }

  private async saveExistingNote(note: Note) {
    try {
      await recipesApi.saveNote({
        recipeId: this.recipeId,
        noteId: note.id,
        note: note
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save note.');
    }
  }

  private async deleteNote(note: Note) {
    try {
      await recipesApi.deleteNote({
        recipeId: this.recipeId,
        noteId: note.id
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete note.');
    }
  }

  private async uploadImage(file: File) {
    try {
      await showLoading(
        async () => {
          await recipesApi.uploadImage({
            recipeId: this.recipeId,
            fileContent: file
          });
        },
        'Uploading picture...');
    } catch (ex) {
      console.error(ex);
      showToast('Failed to upload picture.');
    }
  }

  private async deleteImage(image: RecipeImage) {
    try {
      await recipesApi.deleteImage({
        recipeId: this.recipeId,
        imageId: image.id
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete image.');
    }
  }

  private async setRating(value: number) {
    try {
      await recipesApi.setRating({
        recipeId: this.recipeId,
        rating: value
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save recipe rating.');
    }
  }

  private async setMainImage(image: RecipeImage) {
    try {
      await recipesApi.setMainImage({
        recipeId: this.recipeId,
        imageId: image.id
      });
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
      if (!isNull(data)) {
        await this.saveRecipe({
          ...this.recipe,
          ...data.recipe
        });
        await this.loadRecipe();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
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

              // Update the search results since the modified recipe may be in them
              await refreshSearchResults();
              await redirect('/search');

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

              // Update the search results since the modified recipe may be in them
              await refreshSearchResults();

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

              // Update the search results since the modified recipe may be in them
              await refreshSearchResults();

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
      if (!isNull(data)) {
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
      if (!isNull(data)) {
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
      if (!isNull(data)) {
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
      if (!isNull(data)) {
        await this.uploadImage(data.file);
        await this.loadMainImage();
        await this.loadImages();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
      }
    });
  }

  private async onRatingSelected(rating: number) {
    await this.setRating(rating);
    await this.loadRating();

    // Update the search results since the modified recipe may be in them
    await refreshSearchResults();
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

              // Update the search results since the modified recipe may be in them
              await refreshSearchResults();

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

              // Update the search results since the modified recipe may be in them
              await refreshSearchResults();

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

  private async onTagClicked(tag: string) {
    const filter = getDefaultSearchFilter();
    state.searchFilter = {
      ...filter,
      tags: [tag]
    };
    await redirect('/search');
  }
}
