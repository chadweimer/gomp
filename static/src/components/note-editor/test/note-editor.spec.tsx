import { render, h, describe, it, expect } from '@stencil/vitest';
import { Note } from '../../../generated';
import '../note-editor';

describe('note-editor', () => {
  it('builds', async () => {
    const { root } = await render(<note-editor></note-editor>);
    expect(root).toHaveClass('hydrated');
  });

  it('no initial value', async () => {
    const { root } = await render(<note-editor></note-editor>);
    const textArea = root.shadowRoot?.querySelector('html-editor');
    expect(textArea).not.toBeNull();
    expect(textArea).toHaveProperty('value', '');
  });

  it('bind to note', async () => {
    const note: Note = { text: 'Some text' };
    const { root } = await render(<note-editor note={note}></note-editor>);
    const textArea = root.shadowRoot?.querySelector('html-editor');
    expect(textArea).toHaveProperty('value', note.text);
  });
});
