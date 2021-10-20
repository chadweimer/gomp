import { newSpecPage } from '@stencil/core/testing';
import { PageSettingsPreferences } from '../page-settings-preferences';

describe('page-settings-preferences', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageSettingsPreferences],
      html: '<page-settings-preferences></page-settings-preferences>',
    });
    expect(page.root).toEqualHtml(`
      <page-settings-preferences>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-settings-preferences>
    `);
  });
});
