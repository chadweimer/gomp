import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { alertController } from '@ionic/core';
import { Note } from '../../helpers/schema.gen';
import './note-editor';
import { NoteEditor } from './note-editor';
import { HTMLEditor } from '../html-editor/html-editor';

describe('note-editor', () => {
  function mockAlert(role = 'destructive'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  async function callCanDismiss(modal: HTMLIonModalElement, data?: unknown, role?: string): Promise<boolean | undefined> {
    if (typeof modal.canDismiss === 'function') {
      return await modal.canDismiss(data, role);
    }
    return modal.canDismiss;
  }

  async function createNoteEditor(template = html`<note-editor></note-editor>`) {
    const modal = await fixture<HTMLIonModalElement>(html`
      <ion-modal>
        ${template}
      </ion-modal>
    `);
    modal.dismiss = vi.fn().mockResolvedValue(true);
    const el = modal.querySelector<NoteEditor>('note-editor')!;
    await el.updateComplete;
    return { modal, el };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders default state as New Note', async () => {
    const { el } = await createNoteEditor();

    const title = el.renderRoot.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('New Note');

    const textArea = el.renderRoot.querySelector<HTMLEditor>('html-editor');
    expect(textArea).not.toBeNull();
    expect(textArea?.value).toBe('');
  });

  it('renders Edit Note when note has an id', async () => {
    const note: Note = { id: 10, text: 'Existing text' };
    const { el } = await createNoteEditor(html`<note-editor .note=${note}></note-editor>`);

    const title = el.renderRoot.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('Edit Note');

    const textArea = el.renderRoot.querySelector<HTMLEditor>('html-editor');
    expect(textArea?.value).toBe(note.text);
  });

  describe('canDismiss guard', () => {
    it('allows dismissal without prompt when role is save', async () => {
      const { modal } = await createNoteEditor();

      const canDismiss = await callCanDismiss(modal, undefined, 'save');
      expect(canDismiss).toBe(true);
    });

    it('allows dismissal when text is unchanged', async () => {
      const note: Note = { id: 1, text: 'Original text' };
      const { modal, el } = await createNoteEditor(html`<note-editor .note=${note}></note-editor>`);

      const editor = el.renderRoot.querySelector<HTMLEditor>('html-editor');
      if (editor) {
        editor.getCleanHTML = vi.fn().mockReturnValue('Original text');
      }

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });

    it('prompts to discard changes when text is dirty and confirms discard', async () => {
      const note: Note = { id: 1, text: 'Original text' };
      const { modal, el } = await createNoteEditor(html`<note-editor .note=${note}></note-editor>`);

      const editor = el.renderRoot.querySelector<HTMLEditor>('html-editor');
      if (editor) {
        editor.getCleanHTML = vi.fn().mockReturnValue('Modified text');
      }

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('blocks dismissal when user cancels discard prompt', async () => {
      const note: Note = { id: 1, text: 'Original text' };
      const { modal, el } = await createNoteEditor(html`<note-editor .note=${note}></note-editor>`);

      const editor = el.renderRoot.querySelector<HTMLEditor>('html-editor');
      if (editor) {
        editor.getCleanHTML = vi.fn().mockReturnValue('Modified text');
      }

      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(false);
    });
  });

  describe('user interactions and save/cancel actions', () => {
    it('updates note text when html-editor emits valueChanged', async () => {
      const { el } = await createNoteEditor();
      const editor = el.renderRoot.querySelector('html-editor');

      editor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'New content from editor' }));
      await el.updateComplete;

      expect(el.note.text).toBe('New content from editor');
    });

    it('does not dismiss on save if form validity fails', async () => {
      const { modal, el } = await createNoteEditor();

      const form = el.renderRoot.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).not.toHaveBeenCalled();
    });

    it('dismisses modal with updated note on save', async () => {
      const { modal, el } = await createNoteEditor();

      const editor = el.renderRoot.querySelector('html-editor');
      editor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Saved note content' }));
      await el.updateComplete;

      const form = el.renderRoot.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(true);
      }

      const saveBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).toHaveBeenCalledWith({ note: { text: 'Saved note content' } }, 'save');
    });

    it('dismisses modal with cancel role when Cancel is clicked', async () => {
      const { modal, el } = await createNoteEditor();

      const cancelBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
      cancelBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });
  });
});
