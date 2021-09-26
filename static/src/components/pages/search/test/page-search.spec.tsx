import { newSpecPage } from '@stencil/core/testing';
import { PageSearch } from '../page-search';

describe('page-search', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageSearch],
      html: '<page-search></page-search>',
    });
    expect(page.root).toEqualHtml(`
      <page-search>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-search>
    `);
  });
});
