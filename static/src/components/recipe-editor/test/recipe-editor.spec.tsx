import { newSpecPage } from '@stencil/core/testing';
import { RecipeEditor } from '../recipe-editor';

describe('recipe-editor', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [RecipeEditor],
      html: '<recipe-editor></recipe-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(RecipeEditor);
  });
});
