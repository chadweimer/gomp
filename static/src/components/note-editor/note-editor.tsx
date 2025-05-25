import { Component, Element, Host, h, Prop } from '@stencil/core';
import { Note } from '../../generated';
import { configureModalAutofocus, dismissContainingModal, isNull } from '../../helpers/utils';

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
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{isNull(this.note.id) ? 'New Note' : 'Edit Note'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            <ion-item lines="full">
              <ion-label position="stacked">Text</ion-label>
              <html-editor class="ion-margin-top" value={this.note.text} onValueChanged={e => this.note = { ...this.note, text: e.detail }} />
            </ion-item>
          </form>
        </ion-content>
      </Host>
    );
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    dismissContainingModal(this.el, { note: this.note });
  }

  private onCancelClicked() {
    dismissContainingModal(this.el);
  }

}
