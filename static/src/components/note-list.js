import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@polymer/paper-input/paper-textarea.js';
import '../mixins/gomp-core-mixin.js';
import './note-card.js';
import '../shared-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class NoteList extends GompCoreMixin(GestureEventListeners(PolymerElement)) {
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
            <note-card note="[[item]]" on-note-card-edit="_editNoteTapped" on-note-card-deleted="_noteDeleted"></note-card>
        </template>

        <paper-dialog id="noteDialog" on-iron-overlay-closed="_noteDialogClosed" with-backdrop="">
            <h3><iron-icon icon="editor:insert-comment"></iron-icon> <span>Add Note</span></h3>
            <paper-textarea label="Text" value="{{noteText}}" rows="3" required="" autofocus=""></paper-textarea>
            <div class="buttons">
                <paper-button dialog-dismiss="">Cancel</paper-button>
                <paper-button dialog-confirm="">Save</paper-button>
            </div>
        </paper-dialog>

        <iron-ajax bubbles="" auto="" id="getAjax" url="/api/v1/recipes/[[recipeId]]/notes" on-request="_handleGetRequest" on-response="_handleGetResponse"></iron-ajax>
        <iron-ajax bubbles="" id="postNoteAjax" url="/api/v1/notes" method="POST" on-response="_handlePostNoteResponse" on-error="_handlePostNoteError"></iron-ajax>
        <iron-ajax bubbles="" id="putNoteAjax" url="/api/v1/notes/[[noteId]]" method="PUT" on-response="_handlePutNoteResponse" on-error="_handlePutNoteError"></iron-ajax>
`;
  }

  static get is() { return 'note-list'; }
  static get properties() {
      return {
          recipeId: {
              type: String,
          },
      };
  }

  refresh() {
      if (!this.recipeId) {
          return;
      }

      this.$.getAjax.generateRequest();
  }
  add() {
      this.noteId = null;
      this.noteText = '';
      this.$.noteDialog.open();
  }

  _noteDialogClosed(e) {
      if (e.detail.confirmed) {
          if (this.noteId) {
              this.$.putNoteAjax.body = JSON.stringify({
                  'id': this.noteId,
                  'recipeId': parseInt(this.recipeId, 10),
                  'text': this.noteText,
              });
              this.$.putNoteAjax.generateRequest();
          } else {
              this.$.postNoteAjax.body = JSON.stringify({
                  'recipeId': parseInt(this.recipeId, 10),
                  'text': this.noteText,
              });
              this.$.postNoteAjax.generateRequest();
          }
      }
  }
  _editNoteTapped(e) {
      e.preventDefault();

      this.noteId = e.target.note.id;
      this.noteText = e.target.note.text;
      this.$.noteDialog.open();
  }
  _noteDeleted(e) {
      this.refresh();
  }
  _handleGetRequest(e) {
      this.notes = [];
  }
  _handleGetResponse(e) {
      this.notes = e.detail.response;
  }
  _handlePostNoteResponse(e) {
      this.refresh();
      this.showToast('Note created.');
  }
  _handlePostNoteError(e) {
      this.showToast('Creating note failed!');
  }
  _handlePutNoteResponse(e) {
      this.refresh();
      this.showToast('Note updated.');
  }
  _handlePutNoteError(e) {
      this.showToast('Updating note failed!');
  }
}

window.customElements.define(NoteList.is, NoteList);
