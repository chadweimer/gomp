import { newE2EPage } from '@stencil/core/testing';

describe('page-settings-preferences', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-settings-preferences></page-settings-preferences>');

    const element = await page.find('page-settings-preferences');
    expect(element).toHaveClass('hydrated');
  });
});
