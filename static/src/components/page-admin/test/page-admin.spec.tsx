import { newSpecPage } from '@stencil/core/testing';
import { PageAdmin } from '../page-admin';

describe('page-admin', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageAdmin],
      html: `<page-admin></page-admin>`,
    });
    expect(page.root).toEqualHtml(`
      <page-admin>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-admin>
    `);
  });
});
