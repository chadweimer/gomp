import { newE2EPage } from '@stencil/core/testing';

describe('page-admin-configuration', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-admin-configuration></page-admin-configuration>');

    const element = await page.find('page-admin-configuration');
    expect(element).toHaveClass('hydrated');
  });
});
