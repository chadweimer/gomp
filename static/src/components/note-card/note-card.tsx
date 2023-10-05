import { Component, Event, EventEmitter, Host, Prop, h } from '@stencil/core';
import { Note } from '../../generated';
import { formatDate } from '../../helpers/utils';

@Component({
  tag: 'note-card',
  styleUrl: 'note-card.css',
  scoped: true,
})
export class NoteCard {
  @Prop() note: Note = null;
  @Prop() readonly = false;

  @Event() edit: EventEmitter<Note>;
  @Event() delete: EventEmitter<Note>;

  render() {
    return (
      <Host>
        <ion-card>
          <ion-card-header>
            <ion-item lines="full">
              <ion-icon slot="start" icon="chatbox" />
              <ion-label>{this.getNoteDatesText(this.note?.createdAt, this.note?.modifiedAt)}</ion-label>
              {!this.readonly ?
                <ion-buttons slot="end">
                  <ion-button size="small" color="warning" onClick={() => this.edit.emit(this.note)}>
                    <ion-icon slot="icon-only" icon="create" size="small" />
                  </ion-button>
                  <ion-button size="small" color="danger" onClick={() => this.delete.emit(this.note)}>
                    <ion-icon slot="icon-only" icon="trash" size="small" />
                  </ion-button>
                </ion-buttons>
                : ''}
            </ion-item>
          </ion-card-header>
          <ion-card-content>
            <p class="plain">{this.note?.text}</p>
          </ion-card-content>
        </ion-card>
      </Host>
    );
  }

  private getNoteDatesText(createdAt: string, modifiedAt: string) {
    if (createdAt !== modifiedAt) {
      return (
        <span>
          <span class="ion-text-nowrap">{formatDate(createdAt)}</span> <span class="ion-text-nowrap">(edited: {formatDate(modifiedAt)})</span>
        </span>
      );
    }
    return (
      <span class="ion-text-nowrap">{formatDate(createdAt)}</span>
    );
  }
}
