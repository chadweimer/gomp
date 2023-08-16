import { newSpecPage } from '@stencil/core/testing';
import { PageSettings } from '../page-settings';

describe('page-settings', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageSettings],
      html: '<page-settings></page-settings>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageSettings);
  });
});
