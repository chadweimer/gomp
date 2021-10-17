import { newSpecPage } from '@stencil/core/testing';
import { PageRecipe } from '../page-recipe';

describe('page-recipe', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageRecipe],
      html: '<page-recipe></page-recipe>',
    });
    expect(page.root).toEqualHtml(`
      <page-recipe>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-recipe>
    `);
  });
});
