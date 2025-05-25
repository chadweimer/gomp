import { newSpecPage } from '@stencil/core/testing';
import { HTMLEditor } from '../html-editor';

describe('html-editor', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [HTMLEditor],
      html: '<html-editor></html-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(HTMLEditor);
  });
});
