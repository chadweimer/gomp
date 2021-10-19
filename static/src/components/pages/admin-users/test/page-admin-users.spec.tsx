import { newSpecPage } from '@stencil/core/testing';
import { PageAdminUsers } from '../page-admin-users';

describe('page-admin-users', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageAdminUsers],
      html: '<page-admin-users></page-admin-users>',
    });
    expect(page.root).toEqualHtml(`
      <page-admin-users>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-admin-users>
    `);
  });
});
