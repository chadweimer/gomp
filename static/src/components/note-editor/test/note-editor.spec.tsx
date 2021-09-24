import { newSpecPage } from '@stencil/core/testing';
import { NoteEditor } from '../note-editor';

describe('note-editor', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [NoteEditor],
      html: '<note-editor></note-editor>',
    });
    expect(page.root).toEqualHtml(`
      <note-editor>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </note-editor>
    `);
  });
});
