import { Component, Element, Host, h, Prop } from '@stencil/core';
import { Note } from '../../helpers/schema.gen';
import { configureModalCanDismiss, getContainingModal } from '../../helpers/modals';
import { isNull, toStorageHtml } from '../../helpers/utils';

@Component({
  tag: 'note-editor',
  styleUrl: 'note-editor.css',
  shadow: true,
})
export class NoteEditor {
  @Prop() note: Note = {
    text: ''
  };

  @Element() el!: HTMLNoteEditorElement;
  private form!: HTMLFormElement;
  private textInput!: HTMLHtmlEditorElement;
  private parentModal?: HTMLIonModalElement | null;

  connectedCallback() {
    const initialNote = { ...this.note };

    this.parentModal = getContainingModal(this.el);
    configureModalCanDismiss(this.parentModal, async (_data?: unknown, role?: string) => {
      if (role === 'save') {
        return false;
      }

      // A blur event is not always guaranteed (e.g., if the user clicked the browser back button)
      this.note = {
        ...this.note,
        text: toStorageHtml(this.el, await this.textInput?.getValue())
      };

      return this.note.text !== initialNote.text;
    });
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button color="primary" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{isNull(this.note?.id) ? 'New Note' : 'Edit Note'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el!}>
            <ion-item class="force-overflow" lines="full">
              <html-editor label="Text" label-placement="stacked" value={this.note?.text ?? ''}
                autofocus
                enableHeadings={true}
                enableLinks={true}
                enableLists={true}
                onValueChanged={e => this.note = { ...this.note, text: e.detail }}
                ref={el => this.textInput = el!} />
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

    await this.parentModal?.dismiss({ note: this.note }, 'save');
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }
}
