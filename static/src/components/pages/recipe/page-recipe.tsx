import { actionSheetController, alertController, modalController } from '@ionic/core';
import { Component, Element, h, Method, Prop, State } from '@stencil/core';
import { NotesApi, RecipesApi } from '../../../helpers/api';
import { formatDate, hasAccessLevel } from '../../../helpers/utils';
import { AccessLevel, Note, Recipe, RecipeImage } from '../../../models';
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

  @Element() el: HTMLPageRecipeElement;

  async connectedCallback() {
    await this.load();
  }

  @Method()
  async activatedCallback() {
    await this.load();
  }

  render() {
    return [
      <ion-header class="ion-hide-lg-down" hidden={!hasAccessLevel(state.currentUser, AccessLevel.Editor)}>
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
            <ion-button class="ion-hide-sm-down">
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
            <ion-button>
              <ion-icon slot="start" icon="archive" />
              Archive
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <ion-grid class="no-pad" fixed>
          <ion-row>
            <ion-col>
              <ion-card>
                <ion-card-content>
                  <ion-item lines="none">
                    <ion-avatar slot="start">
                      <img src={this.mainImage?.thumbnailUrl} />
                    </ion-avatar>
                    <h2>{this.recipe?.name}</h2>
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
                      <p class="plain ion-padding">{this.recipe?.sourceUrl}</p>
                    </ion-item>
                    : ''}
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col size-xs="12" size-sm="12" size-md="6" size-lg="6" size-xl="6">
              <h4 class="tab ion-text-center ion-margin-horizontal"><ion-text color="primary">Pictures</ion-text></h4>
              <ion-grid>
                <ion-row>
                  {this.images.map(image =>
                    <ion-col>
                      <a href={image.url} target="_blank">
                        <ion-thumbnail class="large">
                          <ion-img src={image.thumbnailUrl} alt={image.name} />
                        </ion-thumbnail>
                      </a>
                    </ion-col>
                  )}
                </ion-row>
              </ion-grid>
            </ion-col>
            <ion-col size-xs="12" size-sm="12" size-md="6" size-lg="6" size-xl="6">
              <h4 class="tab ion-text-center ion-margin-horizontal"><ion-text color="primary">Notes</ion-text></h4>
              <ion-grid>
                {this.notes.map(note =>
                  <ion-row>
                    <ion-col>
                      <ion-card>
                        <ion-card-header>
                          <ion-item lines="full">
                            <ion-icon slot="start" icon="chatbox" />
                            <ion-label>{formatDate(note.createdAt)} {note.modifiedAt ? '(edited ' + formatDate(note.modifiedAt) + ')' : ''}</ion-label>
                            <ion-buttons slot="end" hidden={!hasAccessLevel(state.currentUser, AccessLevel.Editor)}>
                              <ion-button size="small" fill="default" onClick={() => this.onEditNoteClicked(note)}>
                                <ion-icon slot="icon-only" icon="create" color="warning" size="small" />
                              </ion-button>
                              <ion-button size="small" fill="default" onClick={() => this.onDeleteNoteClicked(note)}>
                                <ion-icon slot="icon-only" icon="trash" color="danger" size="small" />
                              </ion-button>
                            </ion-buttons>
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
      </ion-content>,

      <ion-footer class="ion-hide-lg-up" hidden={!hasAccessLevel(state.currentUser, AccessLevel.Editor)}>
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
            <ion-button class="ion-hide-sm-down">
              <ion-icon slot="start" icon="camera" />
              Upload Picture
            </ion-button>
            <ion-button onClick={() => this.showRecipeMenu()}>
              <ion-icon slot="icon-only" ios="ellipsis-horizontal" md="ellipsis-vertical"></ion-icon>
            </ion-button>
          </ion-buttons>
          <ion-buttons slot="secondary">
            <ion-button class="ion-hide-md-down" onClick={() => this.onDeleteClicked()}>
              <ion-icon slot="start" icon="trash" />
              Delete
            </ion-button>
            <ion-button class="ion-hide-sm-down">
              <ion-icon slot="start" icon="archive" />
              Archive
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
    ];
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
    }
  }

  private async saveNewNote(note: Note) {
    note = {
      ...note,
      recipeId: this.recipeId
    };
    try {
      await NotesApi.post(this.el, note);
      await this.loadNotes();
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveExistingNote(note: Note) {
    try {
      await NotesApi.put(this.el, note);
      await this.loadNotes();
    } catch (ex) {
      console.log(ex);
    }
  }

  private async deleteNote(note: Note) {
    try {
      await NotesApi.delete(this.el, note.id);
      await this.loadNotes();
    } catch (ex) {
      console.log(ex);
    }
  }

  private async showRecipeMenu() {
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
        { text: 'Archive', icon: 'archive', role: 'destructive' },
        { text: 'Add Link', icon: 'link' },
        {
          text: 'Edit',
          icon: 'create',
          handler: async () => {
            await this.onEditClicked();
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
        { text: 'Upload Picture', icon: 'camera' },
        { text: 'Cancel', icon: 'close', role: 'cancel' }
      ]
    });
    await menu.present();
  }

  private async onEditClicked() {
    const modal = await modalController.create({
      component: 'recipe-editor',
      componentProps: {
        recipe: this.recipe
      }
    });
    modal.present();

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
    const confirmation = await alertController.create({
      header: 'Delete Recipe?',
      message: 'Are you sure you want to delete this recipe?',
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.deleteRecipe();
            return true;
          }
        }
      ]
    });

    await confirmation.present();

    // TODO: Redirect
  }

  private async onAddNoteClicked() {
    const modal = await modalController.create({
      component: 'note-editor',
    });
    modal.present();

    const resp = await modal.onDidDismiss<{ dismissed: boolean, note: Note }>();
    if (resp.data?.dismissed === false) {
      await this.saveNewNote(resp.data.note);
    }
  }

  private async onEditNoteClicked(note: Note | null) {
    const modal = await modalController.create({
      component: 'note-editor',
      componentProps: {
        note: note
      }
    });
    modal.present();

    const resp = await modal.onDidDismiss<{ dismissed: boolean, note: Note }>();
    if (resp.data?.dismissed === false) {
      await this.saveExistingNote({
        ...note,
        ...resp.data.note
      });
    }
  }

  private async onDeleteNoteClicked(note: Note) {
    const confirmation = await alertController.create({
      header: 'Delete Note?',
      message: 'Are you sure you want to delete this note?',
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.deleteNote(note);
            return true;
          }
        }
      ]
    });

    await confirmation.present();
  }
}
