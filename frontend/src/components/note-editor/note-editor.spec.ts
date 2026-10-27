import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController } from '@ionic/core';
import { Note } from '../../helpers/schema.gen';
import './note-editor';
import { NoteEditor } from './note-editor';

describe('note-editor', () => {
  let modalEl: HTMLIonModalElement;

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

  beforeEach(() => {
    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);
  });

  afterEach(() => {
    modalEl.remove();
    vi.restoreAllMocks();
  });

  it('renders default state as New Note', async () => {
    const el = await fixture<NoteEditor>(html`<note-editor></note-editor>`);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('New Note');

    const editor = el.shadowRoot?.querySelector('html-editor');
    expect(editor).not.toBeNull();
  });

  it('renders Edit Note when note has an id', async () => {
    const note: Note = { id: 10, text: 'Existing text' };
    const el = await fixture<NoteEditor>(html`<note-editor .note=${note}></note-editor>`);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('Edit Note');
  });

  it('dismisses modal with updated note on save', async () => {
    const note: Note = { id: 10, text: 'Existing text' };
    const el = await fixture<NoteEditor>(html`<note-editor .note=${note}></note-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const saveBtn = el.shadowRoot?.querySelector('ion-buttons[slot="primary"] ion-button') as HTMLElement;
    saveBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith({ note }, 'save');
  });

  it('dismisses modal on cancel', async () => {
    const el = await fixture<NoteEditor>(html`<note-editor></note-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const cancelBtn = el.shadowRoot?.querySelector('ion-buttons[slot="secondary"] ion-button') as HTMLElement;
    cancelBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
  });

  it('guards dismissal when text is modified', async () => {
    const note: Note = { id: 1, text: 'Original text' };
    const el = await fixture<NoteEditor>(html`<note-editor .note=${note}></note-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const editor = el.shadowRoot?.querySelector('html-editor');
    if (editor) {
      editor.getValue = vi.fn().mockResolvedValue('Modified text');
    }

    vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

    const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
    expect(canDismiss).toBe(true);
  });
});

