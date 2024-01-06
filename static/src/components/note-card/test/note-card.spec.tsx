import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { NoteCard } from '../note-card';
import { Note } from '../../../generated';

describe('note-card', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [NoteCard],
      html: '<note-card></note-card>',
    });
    expect(page.rootInstance).toBeInstanceOf(NoteCard);
  });

  it('bind to note', async () => {
    const note: Note = { text: 'Some text', createdAt: new Date().toLocaleDateString() };
    const page = await newSpecPage({
      components: [NoteCard],
      template: () => (<note-card note={note}></note-card>),
    });
    const para = page.root.querySelector('ion-card-content p');
    expect(para).toEqualText(note.text);
  });

  it('readonly works', async () => {
    const values = [true, false];
    for (const readonly of values) {
      const page = await newSpecPage({
        components: [NoteCard],
        template: () => (<note-card readonly={readonly}></note-card>),
      });
      const para = page.root.querySelector('ion-buttons');
      if (readonly) {
        expect(para).toBeNull();
      } else {
        expect(para).not.toBeNull();
        expect(para.childNodes.length).toBe(2);
      }
    }
  });

  it('modified date used', async () => {
    const values = [true, false];
    for (const modified of values) {
      const createdAtStr = new Date().toLocaleDateString();
      const modifiedAt = new Date();
      modifiedAt.setDate(modifiedAt.getDate() + 1);
      const modifiedAtStr = modified ? modifiedAt.toLocaleDateString() : createdAtStr;
      const note: Note = { text: 'Some text', createdAt: createdAtStr, modifiedAt: modifiedAtStr };
      const page = await newSpecPage({
        components: [NoteCard],
        template: () => (<note-card note={note}></note-card>),
      });
      const label = page.root.querySelector('ion-card-header ion-label');
      expect(label).not.toBeNull();
      expect(label.textContent.includes('edited')).toBe(modified);
    }
  });
});
