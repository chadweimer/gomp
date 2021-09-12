import { Dialog } from '@material/mwc-dialog';
import { TextArea } from '@material/mwc-textarea';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { Note } from '../models/models.js';
import { NoteCard } from './note-card.js';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import '@material/mwc-textarea';
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
                mwc-textarea {
                    width: 100%;
                }
          </style>

          <template is="dom-repeat" items="[[notes]]">
              <note-card note="[[item]]" on-note-card-edit="editNoteTapped" on-note-card-deleted="noteDeleted" readonly\$="[[readonly]]"></note-card>
          </template>

          <mwc-dialog id="noteDialog" heading="Add Note" on-closed="noteDialogClosed">
              <mwc-textarea id="noteTextInput" label="Text" rows="3" dialogInitialFocus></mwc-textarea>

              <mwc-button slot="primaryAction" label="Save" on-click="onSaveClicked"></mwc-button>
              <mwc-button slot="secondaryAction" label="Cancel" dialogAction="cancel"></mwc-button>
          </mwc-dialog>
`;
    }

    @query('#noteTextInput')
    private noteTextInput!: TextArea;
    @query('#noteDialog')
    private noteDialog!: Dialog;

    @property({type: String})
    public recipeId = '';
    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected notes: Note[] = [];
    private noteId: number|null = null;

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
        this.openDialog();
    }

    protected async onSaveClicked() {
        const noteText = this.getRequiredTextFieldValue(this.noteTextInput);
        if (noteText == undefined) return;

        this.noteDialog.close();

        if (this.noteId) {
            try {
                const note: Note = {
                    id: this.noteId,
                    recipeId: parseInt(this.recipeId, 10),
                    text: noteText,
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
                    text: noteText,
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

        this.openDialog(noteCard.note);
    }

    protected async noteDeleted() {
        await this.refresh();
    }

    private openDialog(note?: Note) {
        this.noteId = note?.id ?? null;
        this.noteTextInput.value = note?.text ?? '';
        this.noteTextInput.setCustomValidity('');
        this.noteTextInput.reportValidity();
        this.noteDialog.show();
    }
}
