import { newSpecPage } from '@stencil/core/testing';
import { PageAdminMaintenance } from '../page-admin-maintenance';

describe('page-admin-configuration', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageAdminMaintenance],
      html: '<page-admin-maintenance></page-admin-maintenance>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageAdminMaintenance);
  });
});
