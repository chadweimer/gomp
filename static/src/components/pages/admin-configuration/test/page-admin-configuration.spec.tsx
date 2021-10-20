import { newSpecPage } from '@stencil/core/testing';
import { PageAdminConfiguration } from '../page-admin-configuration';

describe('page-admin-configuration', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageAdminConfiguration],
      html: '<page-admin-configuration></page-admin-configuration>',
    });
    expect(page.root).toEqualHtml(`
      <page-admin-configuration>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-admin-configuration>
    `);
  });
});
