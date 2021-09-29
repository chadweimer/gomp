import { Component, Element, h, Prop } from '@stencil/core';
import { configureModalAutofocus } from '../../helpers/utils';
import { Note } from '../../models';

@Component({
  tag: 'note-editor',
  styleUrl: 'note-editor.css',
})
export class NoteEditor {
  @Prop() note: Note = {
    text: ''
  };

  @Element() el!: HTMLNoteEditorElement;
  private form!: HTMLFormElement;

  connectedCallback() {
    configureModalAutofocus(this.el);
  }

  render() {
    return [
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>{!this.note.id ? 'New Note' : 'Edit Note'}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
          <ion-item>
            <ion-label position="stacked">Text</ion-label>
            <ion-textarea value={this.note.text} onIonChange={e => this.note = { ...this.note, text: e.detail.value }} required autofocus auto-grow />
          </ion-item>
        </form>
      </ion-content>
    ];
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    this.el.closest('ion-modal').dismiss({
      dismissed: false,
      note: this.note
    });
  }

  private onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }

}
