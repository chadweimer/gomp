import { newSpecPage } from '@stencil/core/testing';
import { PageSettingsSecurity } from '../page-settings-security';

describe('page-settings-security', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageSettingsSecurity],
      html: '<page-settings-security></page-settings-security>',
    });
    expect(page.root).toEqualHtml(`
      <page-settings-security>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-settings-security>
    `);
  });
});
