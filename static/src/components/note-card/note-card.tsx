import { Component, Event, EventEmitter, Fragment, Host, Prop, h } from '@stencil/core';
import { Note } from '../../generated';
import { formatDate } from '../../helpers/utils';

@Component({
  tag: 'note-card',
  styleUrl: 'note-card.css',
  shadow: true,
})
export class NoteCard {
  @Prop() note: Note = null;
  @Prop() readonly = false;

  @Event() editClicked: EventEmitter<Note>;
  @Event() deleteClicked: EventEmitter<Note>;

  render() {
    return (
      <Host>
        <ion-card class="zoom">
          <ion-card-header>
            <ion-card-title>
              <ion-icon icon="chatbox" />&nbsp;{formatDate(this.note?.createdAt)}
            </ion-card-title>
            {this.note?.createdAt?.getTime() !== this.note?.modifiedAt?.getTime() &&
              <ion-card-subtitle>edited: {formatDate(this.note?.modifiedAt)}</ion-card-subtitle>}
          </ion-card-header>
          <ion-card-content>
            <html-viewer value={this.note?.text} />
          </ion-card-content>
          {!this.readonly &&
            <Fragment>
              <ion-button size="small" fill="clear" onClick={() => this.editClicked.emit(this.note)}>
                <ion-icon slot="start" icon="create" />
                Edit
              </ion-button>
              <ion-button size="small" fill="clear" color="danger" onClick={() => this.deleteClicked.emit(this.note)}>
                <ion-icon slot="start" icon="trash" />
                Delete
              </ion-button>
            </Fragment>
          }
        </ion-card>
      </Host>
    );
  }
}
