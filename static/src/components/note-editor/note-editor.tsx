import { Component, Element, Host, h, Prop } from '@stencil/core';
import { Note } from '../../generated';
import { configureModalAutofocus, dismissContainingModal } from '../../helpers/utils';

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
              <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{!this.note.id ? 'New Note' : 'Edit Note'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            <ion-item>
              <ion-label position="stacked">Text</ion-label>
              <ion-textarea value={this.note.text}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.note = { ...this.note, text: e.target.value }}
                required
                autofocus
                auto-grow />
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
