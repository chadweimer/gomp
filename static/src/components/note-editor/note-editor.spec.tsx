import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { alertController } from '@ionic/core';
import { Note } from '../../helpers/schema.gen';
import './note-editor';

describe('note-editor', () => {
  let modalEl: HTMLIonModalElement;

  function mockAlert(role = 'destructive'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  async function callCanDismiss(
    modal: HTMLIonModalElement,
    data?: unknown,
    role?: string
  ): Promise<boolean | undefined> {
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
    const { root } = await render(<note-editor />);
    expect(root).toHaveClass('hydrated');

    const title = root.shadowRoot?.querySelector('ion-title');
    expect(title).toHaveTextContent('New Note');

    const textArea = root.shadowRoot?.querySelector('html-editor');
    expect(textArea).not.toBeNull();
    expect(textArea).toEqualAttribute('value', '');
  });

  it('renders Edit Note when note has an id', async () => {
    const note: Note = { id: 10, text: 'Existing text' };
    const { root } = await render(<note-editor note={note} />);

    const title = root.shadowRoot?.querySelector('ion-title');
    expect(title).toHaveTextContent('Edit Note');

    const textArea = root.shadowRoot?.querySelector('html-editor');
    expect(textArea).toEqualAttribute('value', note.text);
  });

  describe('canDismiss guard', () => {
    it('allows dismissal without prompt when role is save', async () => {
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const canDismiss = await callCanDismiss(modalEl, undefined, 'save');
      expect(canDismiss).toBe(true);
    });

    it('allows dismissal when text is unchanged', async () => {
      const note: Note = { id: 1, text: 'Original text' };
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor note={note} />);
      modalEl.appendChild(root);
      await waitForChanges();

      const editor = root.shadowRoot?.querySelector<HTMLHtmlEditorElement>('html-editor');
      if (editor) {
        editor.getValue = vi.fn().mockResolvedValue('Original text');
      }

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });

    it('prompts to discard changes when text is dirty and confirms discard', async () => {
      const note: Note = { id: 1, text: 'Original text' };
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor note={note} />);
      modalEl.appendChild(root);
      await waitForChanges();

      const editor = root.shadowRoot?.querySelector<HTMLHtmlEditorElement>('html-editor');
      if (editor) {
        editor.getValue = vi.fn().mockResolvedValue('Modified text');
      }

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('blocks dismissal when user cancels discard prompt', async () => {
      const note: Note = { id: 1, text: 'Original text' };
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor note={note} />);
      modalEl.appendChild(root);
      await waitForChanges();

      const editor = root.shadowRoot?.querySelector<HTMLHtmlEditorElement>('html-editor');
      if (editor) {
        editor.getValue = vi.fn().mockResolvedValue('Modified text');
      }

      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(false);
    });
  });

  describe('user interactions and save/cancel actions', () => {
    it('updates note text when html-editor emits valueChanged', async () => {
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor />);
      const editor = root.shadowRoot?.querySelector('html-editor');

      editor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'New content from editor' }));
      await waitForChanges();

      expect(root.note.text).toBe('New content from editor');
    });

    it('does not dismiss on save if form validity fails', async () => {
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });

    it('dismisses modal with updated note on save', async () => {
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const editor = root.shadowRoot?.querySelector('html-editor');
      editor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Saved note content' }));
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(true);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith({ note: { text: 'Saved note content' } }, 'save');
    });

    it('dismisses modal with cancel role when Cancel is clicked', async () => {
      const { root, waitForChanges } = await render<HTMLNoteEditorElement>(<note-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const cancelBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
      cancelBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });
  });
});
