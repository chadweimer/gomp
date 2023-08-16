import { newSpecPage } from '@stencil/core/testing';
import { PageSettingsSearches } from '../page-settings-searches';

describe('page-settings-searches', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageSettingsSearches],
      html: '<page-settings-searches></page-settings-searches>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageSettingsSearches);
  });
});
