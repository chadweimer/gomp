import { newSpecPage } from '@stencil/core/testing';
import { PageRecipe } from '../page-recipe';

describe('page-recipe', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageRecipe],
      html: '<page-recipe></page-recipe>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageRecipe);
  });
});
