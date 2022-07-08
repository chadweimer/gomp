import { newE2EPage } from '@stencil/core/testing';

describe('page-admin-maintenance', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-admin-maintenance></page-admin-maintenance>');

    const element = await page.find('page-admin-maintenance');
    expect(element).toHaveClass('hydrated');
  });
});
