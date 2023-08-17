import { newSpecPage } from '@stencil/core/testing';
import { PageSettingsPreferences } from '../page-settings-preferences';

describe('page-settings-preferences', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageSettingsPreferences],
      html: '<page-settings-preferences></page-settings-preferences>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageSettingsPreferences);
  });
});
