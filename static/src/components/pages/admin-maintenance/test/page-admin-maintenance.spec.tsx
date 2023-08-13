import { newSpecPage } from '@stencil/core/testing';
import { PageAdminMaintenance } from '../page-admin-maintenance';

describe('page-admin-configuration', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageAdminMaintenance],
      html: '<page-admin-maintenance></page-admin-maintenance>',
    });
    expect(page.root).toEqualHtml(`
      <page-admin-maintenance>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-admin-maintenance>
    `);
  });
});
