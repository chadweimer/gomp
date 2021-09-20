import { newSpecPage } from '@stencil/core/testing';
import { RecipeEditor } from '../recipe-editor';

describe('recipe-editor', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [RecipeEditor],
      html: `<recipe-editor></recipe-editor>`,
    });
    expect(page.root).toEqualHtml(`
      <recipe-editor>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </recipe-editor>
    `);
  });
});
