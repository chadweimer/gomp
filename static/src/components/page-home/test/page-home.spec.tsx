import { newSpecPage } from '@stencil/core/testing';
import { PageHome } from '../page-home';

describe('page-home', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageHome],
      html: `<page-home></page-home>`,
    });
    expect(page.root).toEqualHtml(`
      <page-home>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-home>
    `);
  });
});
