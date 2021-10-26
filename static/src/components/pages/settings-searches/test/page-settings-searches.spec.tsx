import { newSpecPage } from '@stencil/core/testing';
import { PageSettingsSearches } from '../page-settings-searches';

describe('page-settings-searches', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageSettingsSearches],
      html: '<page-settings-searches></page-settings-searches>',
    });
    expect(page.root).toEqualHtml(`
      <page-settings-searches>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-settings-searches>
    `);
  });
});
