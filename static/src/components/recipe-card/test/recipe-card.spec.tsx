import { newSpecPage } from '@stencil/core/testing';
import { RecipeCard } from '../recipe-card';

describe('recipe-card', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [RecipeCard],
      html: '<recipe-card></recipe-card>',
    });
    expect(page.root).toEqualHtml(`
      <recipe-card>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </recipe-card>
    `);
  });
});
