import { newE2EPage } from '@stencil/core/testing';

describe('page-settings-security', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-settings-security></page-settings-security>');

    const element = await page.find('page-settings-security');
    expect(element).toHaveClass('hydrated');
  });
});
