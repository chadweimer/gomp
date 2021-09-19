import { newSpecPage } from '@stencil/core/testing';
import { PageCreateRecipe } from '../page-create-recipe';

describe('page-create-recipe', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageCreateRecipe],
      html: `<page-create-recipe></page-create-recipe>`,
    });
    expect(page.root).toEqualHtml(`
      <page-create-recipe>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-create-recipe>
    `);
  });
});
