import { newSpecPage } from '@stencil/core/testing';
import { PageSettings } from '../page-settings';

describe('page-settings', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageSettings],
      html: `<page-settings></page-settings>`,
    });
    expect(page.root).toEqualHtml(`
      <page-settings>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-settings>
    `);
  });
});
