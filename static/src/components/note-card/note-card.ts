import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Note } from '../../helpers/schema.gen';
import { emit, formatDate, toPresentationHtml } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';

import '../html-viewer/html-viewer';

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
            <ion-icon icon="chatbox"></ion-icon>&nbsp;${formatDate(this.note?.createdAt)}
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
            <ion-icon slot="start" icon="create"></ion-icon>
            Edit
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            color="danger"
            @click=${() => emit(this, 'deleteClicked', this.note)}
          >
            <ion-icon slot="start" icon="trash"></ion-icon>
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
