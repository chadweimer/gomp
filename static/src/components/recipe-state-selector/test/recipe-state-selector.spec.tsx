import { newSpecPage } from '@stencil/core/testing';
import { RecipeStateSelector } from '../recipe-state-selector';

describe('recipe-state-selector', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [RecipeStateSelector],
      html: `<recipe-state-selector></recipe-state-selector>`,
    });
    expect(page.root).toEqualHtml(`
      <recipe-state-selector>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </recipe-state-selector>
    `);
  });
});
