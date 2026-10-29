import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import { Note } from '../../helpers/schema.gen';
import './note-card';
import { NoteCard } from './note-card';

describe('note-card', () => {
  it('renders and binds to note', async () => {
    const note: Note = { text: 'Some text', createdAt: new Date().toISOString() };
    const el = await fixture<NoteCard>(html`<note-card .note=${note}></note-card>`);
    const viewer = el.renderRoot.querySelector('html-viewer');
    expect(viewer).not.toBeNull();
    expect(viewer?.value).toBe(note.text);
  });

  it('toggles edit/delete buttons based on readonly prop', async () => {
    const elReadonly = await fixture<NoteCard>(html`<note-card ?readonly=${true}></note-card>`);
    expect(elReadonly.renderRoot.querySelectorAll('ion-button')).toHaveLength(0);

    const elEditable = await fixture<NoteCard>(html`<note-card ?readonly=${false}></note-card>`);
    expect(elEditable.renderRoot.querySelectorAll('ion-button')).toHaveLength(2);
  });

  it('renders modified date when createdAt differs from modifiedAt', async () => {
    const createdAt = new Date('2026-01-01T12:00:00Z');
    const modifiedAt = new Date('2026-01-02T12:00:00Z');

    const noteSame: Note = { text: 'Same', createdAt: createdAt.toISOString(), modifiedAt: createdAt.toISOString() };
    const elSame = await fixture<NoteCard>(html`<note-card .note=${noteSame}></note-card>`);
    expect(elSame.renderRoot.querySelector('ion-card-subtitle')).toBeNull();

    const noteDiff: Note = { text: 'Diff', createdAt: createdAt.toISOString(), modifiedAt: modifiedAt.toISOString() };
    const elDiff = await fixture<NoteCard>(html`<note-card .note=${noteDiff}></note-card>`);
    const subtitle = elDiff.renderRoot.querySelector('ion-card-subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle?.textContent).toContain('Last Modified');
  });

  it('emits editClicked and deleteClicked events on button click', async () => {
    const note: Note = { id: 123, text: 'Some note text', createdAt: new Date().toISOString() };
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    const el = await fixture<NoteCard>(html`<note-card .note=${note}></note-card>`);
    el.addEventListener('editClicked', (e: Event) => onEdit((e as CustomEvent).detail));
    el.addEventListener('deleteClicked', (e: Event) => onDelete((e as CustomEvent).detail));

    const buttons = el.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-button')!;
    expect(buttons).toHaveLength(2);

    buttons[0].click();
    expect(onEdit).toHaveBeenCalledWith(note);

    buttons[1].click();
    expect(onDelete).toHaveBeenCalledWith(note);
  });
});

