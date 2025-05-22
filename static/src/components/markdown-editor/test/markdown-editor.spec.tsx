import { newSpecPage } from '@stencil/core/testing';
import { MarkdownEditor } from '../markdown-editor';

describe('markdown-editor', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [MarkdownEditor],
      html: '<markdown-editor></markdown-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(MarkdownEditor);
  });
});
