'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@polymer/paper-input/paper-textarea.js';
import './note-card.js';
import '../shared-styles.js';

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
                header {
                    font-size: 1.5em;
                }
                paper-divider {
                    width: 100%;
                }
                #noteDialog h3 {
                    color: var(--paper-blue-500);
                }
                #noteDialog h3 > span {
                    padding-left: 0.25em;
                }
                @media screen and (min-width: 993px) {
                    paper-dialog {
                        width: 33%;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    paper-dialog {
                        width: 75%;
                    }
                }
                @media screen and (max-width: 600px) {
                    paper-dialog {
                        width: 100%;
                    }
                }
          </style>

          <header>Notes</header>
          <paper-divider></paper-divider>
          <template is="dom-repeat" items="[[notes]]">
              <note-card note="[[item]]" on-note-card-edit="editNoteTapped" on-note-card-deleted="noteDeleted"></note-card>
          </template>

          <paper-dialog id="noteDialog" on-iron-overlay-closed="noteDialogClosed" with-backdrop="">
              <h3><iron-icon icon="editor:insert-comment"></iron-icon> <span>Add Note</span></h3>
              <paper-textarea label="Text" value="{{noteText}}" rows="3" required="" autofocus=""></paper-textarea>
              <div class="buttons">
                  <paper-button dialog-dismiss="">Cancel</paper-button>
                  <paper-button dialog-confirm="">Save</paper-button>
              </div>
          </paper-dialog>

          <iron-ajax bubbles="" auto="" id="getAjax" url="/api/v1/recipes/[[recipeId]]/notes" on-request="handleGetRequest" on-response="handleGetResponse"></iron-ajax>
          <iron-ajax bubbles="" id="postNoteAjax" url="/api/v1/notes" method="POST" on-response="handlePostNoteResponse" on-error="handlePostNoteError"></iron-ajax>
          <iron-ajax bubbles="" id="putNoteAjax" url="/api/v1/notes/[[noteId]]" method="PUT" on-response="handlePutNoteResponse" on-error="handlePutNoteError"></iron-ajax>
`;
    }

    @property({type: String})
    public recipeId = '';

    protected noteId: number|null = null;
    protected noteText = '';
    protected notes: any[] = [];

    private get noteDialog(): PaperDialogElement {
        return this.$.noteDialog as PaperDialogElement;
    }
    private get getAjax(): IronAjaxElement {
        return this.$.getAjax as IronAjaxElement;
    }
    private get putNoteAjax(): IronAjaxElement {
        return this.$.putNoteAjax as IronAjaxElement;
    }
    private get postNoteAjax(): IronAjaxElement {
        return this.$.postNoteAjax as IronAjaxElement;
    }

    public refresh() {
        if (!this.recipeId) {
            return;
        }

        this.getAjax.generateRequest();
    }
    public add() {
        this.noteId = null;
        this.noteText = '';
        this.noteDialog.open();
    }

    protected noteDialogClosed(e: CustomEvent) {
        if (!e.detail.canceled && e.detail.confirmed) {
            if (this.noteId) {
                this.putNoteAjax.body = JSON.stringify({
                    id: this.noteId,
                    recipeId: parseInt(this.recipeId, 10),
                    text: this.noteText,
                }) as any;
                this.putNoteAjax.generateRequest();
            } else {
                this.postNoteAjax.body = JSON.stringify({
                    recipeId: parseInt(this.recipeId, 10),
                    text: this.noteText,
                }) as any;
                this.postNoteAjax.generateRequest();
            }
        }
    }
    protected editNoteTapped(e: any) {
        e.preventDefault();

        this.noteId = e.target.note.id;
        this.noteText = e.target.note.text;
        this.noteDialog.open();
    }
    protected noteDeleted() {
        this.refresh();
    }
    protected handleGetRequest() {
        this.notes = [];
    }
    protected handleGetResponse(e: CustomEvent) {
        this.notes = e.detail.response;
    }
    protected handlePostNoteResponse() {
        this.refresh();
        this.showToast('Note created.');
    }
    protected handlePostNoteError() {
        this.showToast('Creating note failed!');
    }
    protected handlePutNoteResponse() {
        this.refresh();
        this.showToast('Note updated.');
    }
    protected handlePutNoteError() {
        this.showToast('Updating note failed!');
    }
}
