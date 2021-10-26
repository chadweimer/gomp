import { newE2EPage } from '@stencil/core/testing';

describe('page-settings-searches', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-settings-searches></page-settings-searches>');

    const element = await page.find('page-settings-searches');
    expect(element).toHaveClass('hydrated');
  });
});
