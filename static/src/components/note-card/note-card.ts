import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Note } from '../../helpers/schema.gen';
import { emit, formatDate, toPresentationHtml } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';

import '../html-viewer/html-viewer';
import '../app-icon/app-icon';

@customElement('note-card')
export class NoteCard extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
        overflow: visible;
      }

      ion-card-title.title {
        display: flex;
        align-items: center;
        font-size: 1rem;
      }
    `
  ];

  @property({ type: Object }) note: Note | null = null;
  @property({ type: Boolean }) readonly = false;

  render() {
    return html`
      <ion-card>
        <ion-card-header>
          <ion-card-title class="title">
            <app-icon name="notes"></app-icon>&nbsp;${formatDate(this.note?.createdAt)}
          </ion-card-title>
          ${this.note?.createdAt !== this.note?.modifiedAt
        ? html`<ion-card-subtitle>Last Modified: ${formatDate(this.note?.modifiedAt)}</ion-card-subtitle>`
        : nothing}
        </ion-card-header>
        <ion-card-content>
          <html-viewer .value=${toPresentationHtml(this, this.note?.text, this.note?.recipeId)}></html-viewer>
        </ion-card-content>
        ${!this.readonly
        ? html`
          <ion-button
            size="small"
            fill="clear"
            @click=${() => emit(this, 'editClicked', this.note)}
          >
            <app-icon slot="start" name="edit_note" size="small"></app-icon>
            Edit
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            color="danger"
            @click=${() => emit(this, 'deleteClicked', this.note)}
          >
            <app-icon slot="start" name="delete" size="small"></app-icon>
            Delete
          </ion-button>
        `
        : nothing}
      </ion-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'note-card': NoteCard;
  }
}
