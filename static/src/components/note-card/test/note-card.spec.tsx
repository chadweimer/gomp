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
    const note: Note = { text: 'Some text', createdAt: new Date() };
    const page = await newSpecPage({
      components: [NoteCard],
      template: () => (<note-card note={note}></note-card>),
    });
    const mv = page.root.querySelector('markdown-viewer');
    expect(mv).toEqualAttribute('value', note.text);
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
      const createdAt = new Date();
      let modifiedAt = new Date();
      modifiedAt.setDate(modifiedAt.getDate() + 1);
      modifiedAt = modified ? modifiedAt : createdAt;
      const note: Note = { text: 'Some text', createdAt: createdAt, modifiedAt: modifiedAt };
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
