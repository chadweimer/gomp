import { newE2EPage } from '@stencil/core/testing';

describe('page-admin-users', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-admin-users></page-admin-users>');

    const element = await page.find('page-admin-users');
    expect(element).toHaveClass('hydrated');
  });
});
