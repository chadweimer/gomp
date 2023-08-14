import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { NoteEditor } from '../note-editor';
import { Note } from '../../../generated';

describe('note-editor', () => {
  it('builds', () => {
    expect(new NoteEditor()).toBeTruthy();
  });

  it('no initial value', async () => {
    const page = await newSpecPage({
      components: [NoteEditor],
      html: '<note-editor></note-editor>',
    });
    const textArea = page.root.querySelector('ion-textarea');
    expect(textArea).toBeTruthy();
    expect(textArea).toEqualAttribute('value', '');
  });

  it('bind to note', async () => {
    const note: Note = { text: 'Some text' };
    const page = await newSpecPage({
      components: [NoteEditor],
      template: () => (<note-editor note={note}></note-editor>),
    });
    const textArea = page.root.querySelector('ion-textarea');
    expect(textArea).toEqualAttribute('value', note.text);
  });
});
