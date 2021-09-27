import { newSpecPage } from '@stencil/core/testing';
import { SearchFilterEditor } from '../search-filter-editor';

describe('search-filter-editor', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [SearchFilterEditor],
      html: '<search-filter-editor></search-filter-editor>',
    });
    expect(page.root).toEqualHtml(`
      <search-filter-editor>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </search-filter-editor>
    `);
  });
});
