import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { Note } from '../../helpers/schema.gen';
import { configureModalCanDismiss, getContainingModal } from '../../helpers/modals';
import { isNull, toStorageHtml } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import { HTMLEditor } from '../html-editor/html-editor';

import '../html-editor/html-editor';

@customElement('note-editor')
export class NoteEditor extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }
    `
  ];

  @property({ type: Object }) note: Note = { text: '' };

  @query('form') private readonly form?: HTMLFormElement;
  @query('html-editor') private readonly textInput?: HTMLEditor;

  private parentModal?: HTMLIonModalElement | null;

  connectedCallback() {
    super.connectedCallback();
    const initialNote = { ...this.note };

    this.parentModal = getContainingModal(this);
    configureModalCanDismiss(this.parentModal, async (_data?: unknown, role?: string) => {
      if (role === 'save') {
        return false;
      }

      this.note = {
        ...this.note,
        text: toStorageHtml(this, (await this.textInput?.getValue?.()) ?? this.note?.text ?? ''),
      };

      return this.note.text !== initialNote.text;
    });
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons slot="primary">
            <ion-button color="primary" @click=${() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>${isNull(this.note?.id) ? 'New Note' : 'Edit Note'}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" @click=${() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <form @submit=${(e: Event) => e.preventDefault()}>
          <ion-item class="force-overflow" lines="full">
            <ion-label position="stacked">Text</ion-label>
            <html-editor
              id="text"
              autofocus
              .value=${this.note?.text ?? ''}
              @valueChanged=${(e: CustomEvent<string>) => (this.note = { ...this.note, text: e.detail })}
            ></html-editor>
          </ion-item>
        </form>
      </ion-content>
    `;
  }

  private async onSaveClicked() {
    if (this.form && !this.form.reportValidity()) {
      return;
    }

    await this.parentModal?.dismiss({ note: this.note }, 'save');
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'note-editor': NoteEditor;
  }
}
