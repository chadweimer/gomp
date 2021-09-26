import { newE2EPage } from '@stencil/core/testing';

describe('page-settings', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-settings></page-settings>');

    const element = await page.find('page-settings');
    expect(element).toHaveClass('hydrated');
  });
});
