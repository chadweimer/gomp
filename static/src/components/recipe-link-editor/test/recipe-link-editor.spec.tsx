import { newSpecPage } from '@stencil/core/testing';
import { RecipeLinkEditor } from '../recipe-link-editor';

describe('recipe-link-editor', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [RecipeLinkEditor],
      html: '<recipe-link-editor></recipe-link-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(RecipeLinkEditor);
  });
});
