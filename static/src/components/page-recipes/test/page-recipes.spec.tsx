import { newSpecPage } from '@stencil/core/testing';
import { PageRecipes } from '../page-recipes';

describe('page-recipes', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageRecipes],
      html: '<page-recipes></page-recipes>',
    });
    expect(page.root).toEqualHtml(`
      <page-recipes>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-recipes>
    `);
  });
});
