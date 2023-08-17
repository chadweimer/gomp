import { newSpecPage } from '@stencil/core/testing';
import { PageAdminUsers } from '../page-admin-users';

describe('page-admin-users', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageAdminUsers],
      html: '<page-admin-users></page-admin-users>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageAdminUsers);
  });
});
