import { newSpecPage } from '@stencil/core/testing';
import { PageAdminConfiguration } from '../page-admin-configuration';

describe('page-admin-configuration', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageAdminConfiguration],
      html: '<page-admin-configuration></page-admin-configuration>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageAdminConfiguration);
  });
});
