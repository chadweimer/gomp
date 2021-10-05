import { newSpecPage } from '@stencil/core/testing';
import { SortBySelector } from '../sort-by-selector';

describe('sort-by-selector', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [SortBySelector],
      html: `<sort-by-selector></sort-by-selector>`,
    });
    expect(page.root).toEqualHtml(`
      <sort-by-selector>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </sort-by-selector>
    `);
  });
});
