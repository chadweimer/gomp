import { LitElement, html, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AccessLevel, Note, Recipe, RecipeCompact, RecipeState } from '../../../helpers/schema.gen';
import { api, fileContentSerializer, refreshSearchResults } from '../../../helpers/api';
import { showActionSheet, showAlert, showLoading, showModal, showToast } from '../../../helpers/modals';
import {
  ComponentWithActivatedCallback,
  getRecipeImageUrl,
  getRecipeThumbnailUrl,
  isAuthorized,
  isNull,
  redirect,
} from '../../../helpers/utils';
import appState, { appStateStore } from '../../../stores/state';
import { StoreController } from '../../../stores/store';
import { getDefaultSearchFilter } from '../../../models';
import '../../recipe-viewer/recipe-viewer';
import '../../recipe-print/recipe-print';
import '../../note-card/note-card';
import '../../recipe-editor/recipe-editor';
import '../../note-editor/note-editor';
import '../../recipe-link-editor/recipe-link-editor';
import '../../file-upload-browser/file-upload-browser';
import './page-recipe.css';

@customElement('page-recipe')
export class PageRecipe extends LitElement implements ComponentWithActivatedCallback {
  protected stateController = new StoreController(this, appStateStore);

  @property({ type: Number }) recipeId = 0;

  @state() private recipe: Recipe | null = null;
  @state() private links: RecipeCompact[] = [];
  @state() private images: string[] = [];
  @state() private notes: Note[] = [];

  createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.load().catch(console.error);
  }

  async activatedCallback() {
    await this.load();
  }

  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('recipeId') && changedProperties.get('recipeId') !== undefined) {
      this.load().catch(console.error);
    }
  }

  render() {
    return html`
      <recipe-print class="show-on-print-only" .recipe=${this.recipe}></recipe-print>
      <ion-content class="hide-on-print">
        <ion-grid class="no-pad" fixed>
          <ion-row>
            <ion-col>
              <recipe-viewer
                .recipe=${this.recipe}
                .links=${this.links}
                ?readonly=${!isAuthorized(appState.currentUser, AccessLevel.Editor)}
                @ratingSelected=${(e: CustomEvent<number>) => void this.onRatingSelected(e.detail)}
                @deleteLinkClicked=${(e: CustomEvent<RecipeCompact>) => void this.onDeleteLinkClicked(e.detail)}
                @tagClicked=${(e: CustomEvent<string>) => void this.onTagClicked(e.detail)}
              ></recipe-viewer>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size="12" size-md="6">
              <h4 class="tab ion-text-center ion-margin-horizontal">
                <ion-text color="primary">Pictures</ion-text>
              </h4>
              <ion-grid class="no-pad">
                <ion-row class="ion-justify-content-evenly">
                  ${this.images?.map(
      (image) => html`
                      <ion-col size="4">
                        <ion-card class="image">
                          <a href=${ifDefined(getRecipeImageUrl(this.recipeId, image))} target="_blank" rel="noopener noreferrer">
                            <ion-thumbnail class="upload zoom">
                              <img
                                loading="lazy"
                                alt=${image}
                                class="thumb"
                                src=${ifDefined(getRecipeThumbnailUrl(this.recipeId, image))}
                              />
                            </ion-thumbnail>
                          </a>
                          ${isAuthorized(appState.currentUser, AccessLevel.Editor)
          ? html`
                                <ion-button
                                  size="small"
                                  fill="clear"
                                  color=${this.recipe?.mainImageName === image ? 'tertiary' : 'medium'}
                                  @click=${() => this.onSetMainImageClicked(image)}
                                  title="Set as main image"
                                >
                                  <ion-icon slot="icon-only" icon="heart"></ion-icon>
                                </ion-button>
                                <ion-button
                                  size="small"
                                  fill="clear"
                                  color="danger"
                                  @click=${() => this.onDeleteImageClicked(image)}
                                  title="Delete image"
                                >
                                  <ion-icon slot="icon-only" icon="trash"></ion-icon>
                                </ion-button>
                              `
          : nothing}
                        </ion-card>
                      </ion-col>
                    `
    )}
                </ion-row>
              </ion-grid>
            </ion-col>
            <ion-col size="12" size-md="6">
              <h4 class="tab ion-text-center ion-margin-horizontal">
                <ion-text color="primary">Notes</ion-text>
              </h4>
              <ion-grid>
                ${this.notes?.map(
      (note) => html`
                    <ion-row>
                      <ion-col>
                        <note-card
                          .note=${note}
                          ?readonly=${!isAuthorized(appState.currentUser, AccessLevel.Editor)}
                          @editClicked=${(e: CustomEvent<Note>) => void this.onEditNoteClicked(e.detail)}
                          @deleteClicked=${(e: CustomEvent<Note>) => void this.onDeleteNoteClicked(e.detail)}
                        ></note-card>
                      </ion-col>
                    </ion-row>
                  `
    )}
              </ion-grid>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
      <ion-footer class="hide-on-print">
        <ion-toolbar color="light">
          <ion-buttons slot="start">
            <ion-back-button defaultHref="/recipes"></ion-back-button>
          </ion-buttons>
          <ion-buttons slot="primary">
            ${isAuthorized(appState.currentUser, AccessLevel.Editor)
        ? html`
                  <ion-button @click=${() => this.onEditClicked()}>
                    <ion-icon slot="start" icon="create"></ion-icon>
                    Edit
                  </ion-button>
                  <ion-button @click=${() => this.onAddNoteClicked()}>
                    <ion-icon slot="start" icon="chatbox"></ion-icon>
                    Add Note
                  </ion-button>
                  <ion-button class="ion-display-none ion-display-sm-flex" @click=${() => this.onUploadImageClicked()}>
                    <ion-icon slot="start" icon="camera"></ion-icon>
                    Upload Picture
                  </ion-button>
                  <ion-button class="ion-display-none ion-display-md-flex" @click=${() => this.onAddLinkClicked()}>
                    <ion-icon slot="start" icon="link"></ion-icon>
                    Add Link
                  </ion-button>
                  <ion-button class="ion-display-none ion-display-lg-flex" @click=${() => this.onArchiveClicked()}>
                    <ion-icon slot="start" icon="archive"></ion-icon>
                    ${this.recipe?.state === RecipeState.Archived ? 'Unarchive' : 'Archive'}
                  </ion-button>
                  <ion-button class="ion-display-none ion-display-lg-flex" @click=${() => this.onDeleteClicked()}>
                    <ion-icon slot="start" icon="trash"></ion-icon>
                    Delete
                  </ion-button>
                `
        : nothing}
            <ion-button class="ion-display-none ion-display-md-flex" @click=${() => this.onPrintClicked()}>
              <ion-icon slot="start" icon="print"></ion-icon>
              Print
            </ion-button>
            <ion-button class="ion-display-lg-none" @click=${() => this.onRecipeMenuClicked()}>
              <ion-icon slot="icon-only" ios="ellipsis-horizontal" md="ellipsis-vertical"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    `;
  }

  async load() {
    await this.loadRecipe();
    await this.loadLinks();
    await this.loadImages();
    await this.loadNotes();
  }

  private async loadRecipe() {
    try {
      const { data: recipe, error } = await api.client.GET('/recipes/{recipeId}', {
        params: { path: { recipeId: this.recipeId } },
      });

      if (error) {
        throw new Error('Failed to load recipe.', { cause: error });
      }

      this.recipe = recipe ?? null;
    } catch (ex) {
      this.recipe = null;
      console.error(ex);
    }
  }

  private async loadLinks() {
    try {
      const { data: links, error } = await api.client.GET('/recipes/{recipeId}/links', {
        params: { path: { recipeId: this.recipeId } },
      });

      if (error) {
        throw new Error('Failed to load links.', { cause: error });
      }
      this.links = links ?? [];
    } catch (ex) {
      this.links = [];
      console.error(ex);
    }
  }

  private async loadImages() {
    try {
      const { data: images, error } = await api.client.GET('/recipes/{recipeId}/images', {
        params: { path: { recipeId: this.recipeId } },
      });

      if (error) {
        throw new Error('Failed to load images.', { cause: error });
      }

      this.images = images ?? [];
    } catch (ex) {
      this.images = [];
      console.error(ex);
    }
  }

  private async loadNotes() {
    try {
      const { data: notes, error } = await api.client.GET('/recipes/{recipeId}/notes', {
        params: { path: { recipeId: this.recipeId } },
      });

      if (error) {
        throw new Error('Failed to load notes.', { cause: error });
      }
      this.notes = notes ?? [];
    } catch (ex) {
      this.notes = [];
      console.error(ex);
    }
  }

  private async saveRecipe(recipe: Recipe) {
    try {
      const { error } = await api.client.PUT('/recipes/{recipeId}', {
        params: { path: { recipeId: this.recipeId } },
        body: recipe,
      });

      if (error) {
        throw new Error('Failed to save recipe.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save recipe.');
    }
  }

  private async deleteRecipe() {
    try {
      const { error } = await api.client.DELETE('/recipes/{recipeId}', {
        params: { path: { recipeId: this.recipeId } },
      });

      if (error) {
        throw new Error('Failed to delete recipe.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete recipe.');
    }
  }

  private async setRecipeState(state: RecipeState) {
    try {
      const { error } = await api.client.PATCH('/recipes/{recipeId}', {
        params: { path: { recipeId: this.recipeId } },
        body: { state },
      });

      if (error) {
        throw new Error('Failed to save recipe state.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save recipe state.');
    }
  }

  private async addLink(recipeId: number) {
    try {
      const { error } = await api.client.PUT('/recipes/{recipeId}/links/{destRecipeId}', {
        params: { path: { recipeId: this.recipeId, destRecipeId: recipeId } },
      });

      if (error) {
        throw new Error('Failed to add link to recipe.', { cause: error });
      }
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

      const { error } = await api.client.DELETE('/recipes/{recipeId}/links/{destRecipeId}', {
        params: { path: { recipeId: this.recipeId, destRecipeId: link.id } },
      });

      if (error) {
        throw new Error('Failed to delete linked recipe.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete linked recipe.');
    }
  }

  private async setMainImage(image: string) {
    try {
      const { error } = await api.client.PATCH('/recipes/{recipeId}', {
        params: { path: { recipeId: this.recipeId } },
        body: { mainImageName: image },
      });

      if (error) {
        throw new Error('Failed to save main image for recipe.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save main image for recipe.');
    }
  }

  private async uploadImage(file: File) {
    await showLoading(async () => {
      try {
        const { error } = await api.client.POST('/recipes/{recipeId}/images', {
          params: { path: { recipeId: this.recipeId } },
          body: file,
          bodySerializer(body) {
            return fileContentSerializer(body, file);
          },
        });

        if (error) {
          throw new Error('Failed to upload picture.', { cause: error });
        }
      } catch (ex) {
        console.error(ex);
        await showToast('Failed to upload picture.');
      }
    }, 'Uploading picture...');
  }

  private async deleteImage(image: string) {
    try {
      const { error, response } = await api.client.DELETE('/recipes/{recipeId}/images/{name}', {
        params: { path: { recipeId: this.recipeId, name: image } },
      });

      if (response?.status === 409) {
        await showToast('Cannot delete this image because it is referenced in the recipe directions.');
        return;
      }

      if (error) {
        throw new Error('Failed to delete picture.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete picture.');
    }
  }

  private async saveNote(note: Note) {
    try {
      if (isNull(note.id)) {
        const { error } = await api.client.POST('/recipes/{recipeId}/notes', {
          params: { path: { recipeId: this.recipeId } },
          body: note,
        });

        if (error) {
          throw new Error('Failed to create new note.', { cause: error });
        }
      } else {
        const { error } = await api.client.PUT('/recipes/{recipeId}/notes/{noteId}', {
          params: { path: { recipeId: this.recipeId, noteId: note.id } },
          body: note,
        });

        if (error) {
          throw new Error('Failed to save note.', { cause: error });
        }
      }
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

      const { error } = await api.client.DELETE('/recipes/{recipeId}/notes/{noteId}', {
        params: { path: { recipeId: this.recipeId, noteId: note.id } },
      });

      if (error) {
        throw new Error('Failed to delete note.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete note.');
    }
  }

  private async setRating(rating: number) {
    try {
      const { error } = await api.client.PATCH('/recipes/{recipeId}', {
        params: { path: { recipeId: this.recipeId } },
        body: { rating },
      });

      if (error) {
        throw new Error('Failed to save recipe rating.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save recipe rating.');
    }
  }

  private async onRatingSelected(rating: number) {
    await this.setRating(rating);
    await this.loadRecipe();
  }

  private async onDeleteLinkClicked(link: RecipeCompact) {
    const { role } = await showAlert({
      header: 'Delete Link',
      message: `Are you sure you want to delete the link to ${link.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' },
      ],
    });
    if (role === 'destructive') {
      await this.deleteLink(link);
      await this.loadLinks();
    }
  }

  private async onTagClicked(tag: string) {
    appState.searchFilter = {
      ...getDefaultSearchFilter(),
      tags: [tag],
    };
    await redirect('/recipes');
  }

  private async onSetMainImageClicked(image: string) {
    const { role } = await showAlert({
      header: 'Set Main Picture?',
      message: 'Are you sure you want to this as the main picture for the recipe?',
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Yes', role: 'confirm' },
      ],
    });

    if (role === 'confirm') {
      await this.setMainImage(image);
      await this.loadRecipe();

      // Update the search results since the modified recipe may be in them
      await refreshSearchResults();
    }
  }

  private async onDeleteImageClicked(image: string) {
    const { role } = await showAlert({
      header: 'Delete Picture',
      message: 'Are you sure you want to delete this picture?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' },
      ],
    });
    if (role === 'destructive') {
      await this.deleteImage(image);
      await this.loadImages();
    }
  }

  private async onEditNoteClicked(note: Note) {
    const { data } = await showModal<{ note: Note }>({
      presentingElement: this,
      component: 'note-editor',
      componentProps: { note },
    });
    if (!isNull(data)) {
      await this.saveNote(data.note);
      await this.loadNotes();
    }
  }

  private async onDeleteNoteClicked(note: Note) {
    const { role } = await showAlert({
      header: 'Delete Note',
      message: 'Are you sure you want to delete this note?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' },
      ],
    });
    if (role === 'destructive') {
      await this.deleteNote(note);
      await this.loadNotes();
    }
  }

  private async onEditClicked() {
    const { data } = await showModal<{ recipe: Recipe }>({
      presentingElement: this,
      component: 'recipe-editor',
      componentProps: {
        recipe: this.recipe,
        recipeImages: this.images,
      },
    });
    if (!isNull(data)) {
      await this.saveRecipe(data.recipe);
      await this.load();
    }
  }

  private async onAddNoteClicked() {
    const { data } = await showModal<{ note: Note }>({
      presentingElement: this,
      component: 'note-editor',
    });
    if (!isNull(data)) {
      await this.saveNote(data.note);
      await this.loadNotes();
    }
  }

  private async onUploadImageClicked() {
    const { data } = await showModal<{ file: File }>({
      presentingElement: this,
      component: 'file-upload-browser',
      componentProps: {
        heading: 'Upload Picture',
        label: 'Picture',
        accept: '.jpg,.jpeg,.png',
      },
    });
    if (!isNull(data)) {
      await this.uploadImage(data.file);
      await this.loadImages();
    }
  }

  private async onAddLinkClicked() {
    const { data } = await showModal<{ recipeId: number }>({
      presentingElement: this,
      component: 'recipe-link-editor',
      componentProps: {
        parentRecipeId: this.recipeId,
      },
    });
    if (!isNull(data)) {
      await this.addLink(data.recipeId);
      await this.loadLinks();
    }
  }

  private async onArchiveClicked() {
    const isArchived = this.recipe?.state === RecipeState.Archived;
    const action = isArchived ? 'unarchive' : 'archive';
    const { role } = await showAlert({
      header: `${isArchived ? 'Unarchive' : 'Archive'} Recipe`,
      message: `Are you sure you want to ${action} this recipe?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: isArchived ? 'Unarchive' : 'Archive', role: 'confirm' },
      ],
    });
    if (role === 'confirm') {
      await this.setRecipeState(isArchived ? RecipeState.Active : RecipeState.Archived);
      await this.loadRecipe();
    }
  }

  private async onDeleteClicked() {
    const { role } = await showAlert({
      header: 'Delete Recipe',
      message: 'Are you sure you want to delete this recipe?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' },
      ],
    });
    if (role === 'destructive') {
      await this.deleteRecipe();
      await refreshSearchResults();
      await redirect('/recipes');
    }
  }

  private onPrintClicked() {
    window.print();
  }

  private async onRecipeMenuClicked() {
    const isArchived = this.recipe?.state === RecipeState.Archived;
    const action = isArchived ? 'Unarchive' : 'Archive';

    const { role } = await showActionSheet({
      header: 'Menu',
      buttons: [
        { text: 'Print', icon: 'print', role: 'print' },
        ...(isAuthorized(appState.currentUser, AccessLevel.Editor)
          ? [
            { text: 'Delete', icon: 'trash', role: 'destructive' },
            { text: action, icon: 'archive', role: 'archive' },
            { text: 'Add Link', icon: 'link', role: 'add-link' },
            { text: 'Upload Picture', icon: 'camera', role: 'upload-image' },
            { text: 'Add Note', icon: 'chatbox', role: 'add-note' },
            { text: 'Edit', icon: 'create', role: 'edit' },
          ]
          : []),
        { text: 'Cancel', icon: 'close', role: 'cancel' },
      ],
    });

    switch (role) {
      case 'print':
        this.onPrintClicked();
        break;
      case 'destructive':
        await this.onDeleteClicked();
        break;
      case 'archive':
        await this.onArchiveClicked();
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
}

declare global {
  interface HTMLElementTagNameMap {
    'page-recipe': PageRecipe;
  }
}
