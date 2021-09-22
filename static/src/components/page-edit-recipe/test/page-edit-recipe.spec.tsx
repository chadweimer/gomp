import { newSpecPage } from '@stencil/core/testing';
import { PageEditRecipe } from '../page-edit-recipe';

describe('page-edit-recipe', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageEditRecipe],
      html: '<page-edit-recipe></page-edit-recipe>',
    });
    expect(page.root).toEqualHtml(`
      <page-edit-recipe>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-edit-recipe>
    `);
  });
});
