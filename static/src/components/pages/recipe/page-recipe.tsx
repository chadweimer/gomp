import { actionSheetController, alertController, modalController } from '@ionic/core';
import { Component, Element, Fragment, h, Host, Method, Prop, State } from '@stencil/core';
import { AccessLevel, Note, Recipe, RecipeCompact, RecipeState } from '../../../generated';
import { recipesApi, refreshSearchResults } from '../../../helpers/api';
import { ComponentWithActivatedCallback, enableBackForOverlay, getRecipeImageUrl, getRecipeThumbnailUrl, isAuthorized, isNull, redirect, showLoading, showToast } from '../../../helpers/utils';
import state from '../../../stores/state';
import { getDefaultSearchFilter } from '../../../models';

@Component({
  tag: 'page-recipe',
  styleUrl: 'page-recipe.css'
})
export class PageRecipe implements ComponentWithActivatedCallback {
  @Prop() recipeId: number = 0;

  @State() recipe: Recipe | null = null;
  @State() recipeRating: number = 0;
  @State() links: RecipeCompact[] = [];
  @State() images: string[] = [];
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
        <recipe-print class="show-on-print-only" recipe={this.recipe} rating={this.recipeRating} />
        <ion-content class="hide-on-print">
          <ion-grid class="no-pad">
            <ion-row>
              <ion-col size="12" size-lg="9" size-xl="8" offset-xl="2">
                <recipe-viewer
                  recipe={this.recipe}
                  rating={this.recipeRating}
                  links={this.links}
                  readonly={!isAuthorized(state.currentUser, AccessLevel.Editor)}
                  onRatingSelected={e => void this.onRatingSelected(e.detail)}
                  onDeleteLinkClicked={e => void this.onDeleteLinkClicked(e.detail)}
                  onTagClicked={e => void this.onTagClicked(e.detail)} />
              </ion-col>
              <ion-col size="0" size-lg="3" size-xl="2">
                <ion-list class="side-menu">
                  {isAuthorized(state.currentUser, AccessLevel.Editor) &&
                    <Fragment>
                      <ion-item button onClick={() => this.onEditClicked()}>
                        <ion-icon slot="start" icon="create" />
                        Edit
                      </ion-item>
                      <ion-item button onClick={() => this.onAddNoteClicked()}>
                        <ion-icon slot="start" icon="chatbox" />
                        Add Note
                      </ion-item>
                      <ion-item button class="ion-hide-sm-down" onClick={() => this.onUploadImageClicked()}>
                        <ion-icon slot="start" icon="camera" />
                        Upload Picture
                      </ion-item>
                      <ion-item button class="ion-hide-md-down" onClick={() => this.onAddLinkClicked()}>
                        <ion-icon slot="start" icon="link" />
                        Add Link
                      </ion-item>
                      {this.recipe?.state === RecipeState.Archived ?
                        <ion-item button class="ion-hide-lg-down" onClick={() => this.onUnarchiveClicked()}>
                          <ion-icon slot="start" icon="archive" />
                          Unarchive
                        </ion-item>
                        :
                        <ion-item button class="ion-hide-lg-down" onClick={() => this.onArchiveClicked()}>
                          <ion-icon slot="start" icon="archive" />
                          Archive
                        </ion-item>
                      }
                      <ion-item button class="ion-hide-lg-down" onClick={() => this.onDeleteClicked()}>
                        <ion-icon slot="start" icon="trash" />
                        Delete
                      </ion-item>
                    </Fragment>
                  }
                  <ion-item button class="ion-hide-md-down" onClick={() => this.onPrintClicked()}>
                    <ion-icon slot="start" icon="print" />
                    Print
                  </ion-item>
                </ion-list>
              </ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="12" size-md="6" size-xl="4" offset-xl="2">
                <h4 class="tab ion-text-center ion-margin-horizontal"><ion-text color="primary">Pictures</ion-text></h4>
                <ion-grid class="no-pad">
                  <ion-row class="ion-justify-content-center">
                    {this.images?.map(image =>
                      <ion-col key={image} size="auto">
                        <ion-card class="zoom">
                          <a href={getRecipeImageUrl(this.recipeId, image)} target="_blank" rel="noopener noreferrer">
                            <ion-thumbnail class="upload">
                              <ion-img alt={image} class="thumb" src={getRecipeThumbnailUrl(this.recipeId, image)} />
                            </ion-thumbnail>
                          </a>
                          {isAuthorized(state.currentUser, AccessLevel.Editor) &&
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
                          }
                        </ion-card>
                      </ion-col>
                    )}
                  </ion-row>
                </ion-grid>
              </ion-col>
              <ion-col size="12" size-md="6" size-xl="4">
                <h4 class="tab ion-text-center ion-margin-horizontal"><ion-text color="primary">Notes</ion-text></h4>
                <ion-grid>
                  {this.notes?.map(note =>
                    <ion-row key={note.id}>
                      <ion-col>
                        <note-card
                          note={note}
                          readonly={!isAuthorized(state.currentUser, AccessLevel.Editor)}
                          onEditClicked={e => void this.onEditNoteClicked(e.detail)}
                          onDeleteClicked={e => void this.onDeleteNoteClicked(e.detail)} />
                      </ion-col>
                    </ion-row>
                  )}
                </ion-grid>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
        <ion-footer class="ion-hide-lg-up hide-on-print">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-back-button defaultHref="/recipes" />
            </ion-buttons>
            <ion-buttons slot="primary">
              {isAuthorized(state.currentUser, AccessLevel.Editor) &&
                <Fragment>
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
                </Fragment>
              }
              <ion-button onClick={() => this.onRecipeMenuClicked()}>
                <ion-icon slot="icon-only" ios="ellipsis-horizontal" md="ellipsis-vertical" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-footer>
      </Host>
    );
  }

  private async load() {
    await this.loadRecipe();
    await this.loadRating();
    await this.loadLinks();
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
      this.recipeRating = 0;
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
      await showToast('Failed to save recipe.');
    }
  }

  private async deleteRecipe() {
    try {
      await recipesApi.deleteRecipe({
        recipeId: this.recipeId
      });
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete recipe.');
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
      await showToast('Failed to save recipe state.');
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
      await showToast('Failed to add linked recipe.');
    }
  }

  private async deleteLink(link: RecipeCompact) {
    try {
      if (isNull(link.id)) {
        throw new Error('Cannot delete link: linked recipe ID is null.');
      }

      await recipesApi.deleteLink({
        recipeId: this.recipeId,
        destRecipeId: link.id
      });
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to remove linked recipe.');
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
      await showToast('Failed to create note.');
    }
  }

  private async saveExistingNote(note: Note) {
    try {
      if (isNull(note.id)) {
        throw new Error('Cannot save note: note ID is null.');
      }

      await recipesApi.saveNote({
        recipeId: this.recipeId,
        noteId: note.id,
        note: note
      });
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save note.');
    }
  }

  private async deleteNote(note: Note) {
    try {
      if (isNull(note.id)) {
        throw new Error('Cannot delete note: note ID is null.');
      }

      await recipesApi.deleteNote({
        recipeId: this.recipeId,
        noteId: note.id
      });
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete note.');
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
      await showToast('Failed to upload picture.');
    }
  }

  private async deleteImage(image: string) {
    try {
      await recipesApi.deleteImage({
        recipeId: this.recipeId,
        name: image
      });
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete image.');
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
      await showToast('Failed to save recipe rating.');
    }
  }

  private async setMainImage(image: string) {
    try {
      const recipe = await recipesApi.getRecipe({
        recipeId: this.recipeId
      });
      await this.saveRecipe({
        ...recipe,
        mainImageName: image
      });
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to set main picture.');
    }
  }

  private async onRecipeMenuClicked() {
    const menu = await actionSheetController.create({
      header: 'Menu',
      buttons: [
        { text: 'Print', icon: 'print', role: 'print' },
        ...(isAuthorized(state.currentUser, AccessLevel.Editor) ?
          [
            { text: 'Delete', icon: 'trash', role: 'destructive' },
            {
              text: this.recipe?.state === RecipeState.Archived ? 'Unarchive' : 'Archive',
              icon: 'archive',
              role: 'archive'
            },
            { text: 'Add Link', icon: 'link', role: 'add-link' },
            { text: 'Upload Picture', icon: 'camera', role: 'upload-image' },
            { text: 'Add Note', icon: 'chatbox', role: 'add-note' },
            { text: 'Edit', icon: 'create', role: 'edit' }
          ] : []),
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ],
    });
    await menu.present();

    const { role } = await menu.onDidDismiss();

    switch (role) {
      case 'print':
        this.onPrintClicked();
        break;
      case 'destructive':
        await this.onDeleteClicked();
        break;
      case 'archive':
        await (this.recipe?.state === RecipeState.Archived
          ? this.onUnarchiveClicked()
          : this.onArchiveClicked());
        break;
      case 'add-link':
        await this.onAddLinkClicked();
        break;
      case 'upload-image':
        await this.onUploadImageClicked();
        break;
      case 'add-note':
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
        componentProps: {
          recipe: this.recipe
        },
        backdropDismiss: false,
      });
      await modal.present();

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
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.deleteRecipe();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
        await redirect('/recipes');
      }
    });
  }

  private async onArchiveClicked() {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Arhive Recipe?',
        message: 'Are you sure you want to archive this recipe?',
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.setRecipeState(RecipeState.Archived);
        await this.loadRecipe();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
      }
    });
  }

  private async onUnarchiveClicked() {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Unarchive Recipe?',
        message: 'Are you sure you want to unarchive this recipe?',
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.setRecipeState(RecipeState.Active);
        await this.loadRecipe();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
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
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.deleteLink(link);
        await this.loadLinks();
      }
    });
  }

  private async onAddNoteClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'note-editor',
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
        componentProps: {
          note: note
        },
        backdropDismiss: false,
      });
      await modal.present();

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
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.deleteNote(note);
        await this.loadNotes();
      }
    });
  }

  private async onUploadImageClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'file-upload-browser',
        componentProps: {
          heading: 'Upload Picture',
          label: 'Picture',
          accept: 'image/*',
        },
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ file: File }>();
      if (!isNull(data)) {
        await this.uploadImage(data.file);
        await this.loadRecipe();
        await this.loadImages();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
      }
    });
  }

  private onPrintClicked() {
    window?.print();
  }

  private async onRatingSelected(rating: number) {
    await this.setRating(rating);
    await this.loadRating();

    // Update the search results since the modified recipe may be in them
    await refreshSearchResults();
  }

  private async onSetMainImageClicked(image: string) {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Set Main Picture?',
        message: 'Are you sure you want to this as the main picture for the recipe?',
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.setMainImage(image);
        await this.loadRecipe();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
      }
    });
  }

  private async onDeleteImageClicked(image: string) {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Delete Image?',
        message: 'Are you sure you want to delete this picture?',
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.deleteImage(image);
        await this.loadRecipe();
        await this.loadImages();

        // Update the search results since the modified recipe may be in them
        await refreshSearchResults();
      }
    });
  }

  private async onTagClicked(tag: string) {
    const filter = getDefaultSearchFilter();
    state.searchFilter = {
      ...filter,
      tags: [tag]
    };
    await redirect('/recipes');
  }
}
