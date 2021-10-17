import { newSpecPage } from '@stencil/core/testing';
import { RecipeLinkEditor } from '../recipe-link-editor';

describe('recipe-link-editor', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [RecipeLinkEditor],
      html: '<recipe-link-editor></recipe-link-editor>',
    });
    expect(page.root).toEqualHtml(`
      <recipe-link-editor>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </recipe-link-editor>
    `);
  });
});
