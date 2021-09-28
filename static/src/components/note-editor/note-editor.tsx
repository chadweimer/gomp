import { Component, Element, h, Prop, State } from '@stencil/core';
import { configureModalAutofocus } from '../../helpers/utils';
import { Note } from '../../models';

@Component({
  tag: 'note-editor',
  styleUrl: 'note-editor.css',
})
export class NoteEditor {
  @Prop() note: Note | null = null;

  @State() noteText = '';

  @Element() el: HTMLNoteEditorElement;
  private form: HTMLFormElement;

  connectedCallback() {
    configureModalAutofocus(this.el);

    if (this.note !== null) {
      this.noteText = this.note.text;
    }
  }

  render() {
    return (
      <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button type="submit" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{this.note === null ? 'New Note' : 'Edit Note'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-item>
            <ion-label position="stacked">Text</ion-label>
            <ion-textarea value={this.noteText} onIonChange={e => this.noteText = e.detail.value} required autofocus auto-grow />
          </ion-item>
        </ion-content>
      </form>
    );
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    this.el.closest('ion-modal').dismiss({
      dismissed: false,
      note: {
        text: this.noteText
      } as Note
    });
  }

  private onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }

}
