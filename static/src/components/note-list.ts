import { Dialog } from '@material/mwc-dialog';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { Note } from '../models/models.js';
import { NoteCard } from './note-card.js';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
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

          <mwc-dialog id="noteDialog" heading="Add Note" on-closed="noteDialogClosed">
              <paper-textarea label="Text" value="{{noteText}}" rows="3" required dialogInitialFocus></paper-textarea>
              <mwc-button slot="primaryAction" label="Save" dialogAction="save"></mwc-button>
              <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
          </mwc-dialog>
`;
    }

    @property({type: String})
    public recipeId = '';

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected noteId: number|null = null;
    protected noteText = '';
    protected notes: Note[] = [];

    private get noteDialog() {
        return this.$.noteDialog as Dialog;
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
        this.noteDialog.show();
    }

    protected async noteDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.detail.action !== 'save') {
            return;
        }

        if (this.noteId) {
            try {
                const note: Note = {
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
                const note: Note = {
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
        if (!noteCard.note) {
            console.error('Cannot edit a null note');
            return;
        }

        this.noteId = noteCard.note.id ?? null;
        this.noteText = noteCard.note.text;
        this.noteDialog.show();
    }
    protected async noteDeleted() {
        await this.refresh();
    }
}
