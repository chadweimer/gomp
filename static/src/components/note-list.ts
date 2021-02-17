'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { Note } from '../models/models.js';
import { NoteCard } from './note-card.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-input/paper-textarea.js';
import './note-card.js';
import '../common/shared-styles.js';

@customElement('note-list')
export class NoteList extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                note-card {
                    margin: 5px;
                }
          </style>

          <template is="dom-repeat" items="[[notes]]">
              <note-card note="[[item]]" on-note-card-edit="editNoteTapped" on-note-card-deleted="noteDeleted" readonly\$="[[readonly]]"></note-card>
          </template>

          <paper-dialog id="noteDialog" on-iron-overlay-closed="noteDialogClosed" with-backdrop>
              <h3 class="blue"><iron-icon icon="editor:insert-comment"></iron-icon> <span>Add Note</span></h3>
              <paper-textarea label="Text" value="{{noteText}}" rows="3" required autofocus></paper-textarea>
              <div class="buttons">
                  <paper-button dialog-dismiss>Cancel</paper-button>
                  <paper-button dialog-confirm>Save</paper-button>
              </div>
          </paper-dialog>
`;
    }

    @property({type: String})
    public recipeId = '';

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected noteId: number = null;
    protected noteText = '';
    protected notes: Note[] = [];

    private get noteDialog(): PaperDialogElement {
        return this.$.noteDialog as PaperDialogElement;
    }

    public async refresh() {
        if (!this.recipeId) {
            return;
        }

        this.notes = [];
        try{
            this.notes = await this.AjaxGetWithResult(`/api/v1/recipes/${this.recipeId}/notes`);
        } catch (e) {
            console.error(e);
        }
    }
    public add() {
        this.noteId = null;
        this.noteText = '';
        this.noteDialog.open();
    }

    protected async noteDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.detail.canceled || !e.detail.confirmed) {
            return;
        }

        if (this.noteId) {
            try {
                const note = {
                    id: this.noteId,
                    recipeId: parseInt(this.recipeId, 10),
                    text: this.noteText,
                };
                await this.AjaxPut(`/api/v1/notes/${this.noteId}`, note);
                this.showToast('Note updated.');
                await this.refresh();
            } catch (e) {
                this.showToast('Updating note failed!');
                console.error(e);
            }
        } else {
            try {
                const note = {
                    recipeId: parseInt(this.recipeId, 10),
                    text: this.noteText,
                };
                await this.AjaxPost('/api/v1/notes', note);
                this.showToast('Note created.');
                await this.refresh();
            } catch (e) {
                this.showToast('Creating note failed!');
                console.error(e);
            }
        }
    }
    protected editNoteTapped(e: Event) {
        e.preventDefault();

        const noteCard = e.target as NoteCard;

        this.noteId = noteCard.note.id;
        this.noteText = noteCard.note.text;
        this.noteDialog.open();
    }
    protected async noteDeleted() {
        await this.refresh();
    }
}
