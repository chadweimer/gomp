import { newSpecPage } from '@stencil/core/testing';
import { PageSettingsSecurity } from '../page-settings-security';

describe('page-settings-security', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageSettingsSecurity],
      html: '<page-settings-security></page-settings-security>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageSettingsSecurity);
  });
});
