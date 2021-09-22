import { newSpecPage } from '@stencil/core/testing';
import { PageViewRecipe } from '../page-view-recipe';

describe('page-view-recipe', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageViewRecipe],
      html: '<page-view-recipe></page-view-recipe>',
    });
    expect(page.root).toEqualHtml(`
      <page-view-recipe>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-view-recipe>
    `);
  });
});
