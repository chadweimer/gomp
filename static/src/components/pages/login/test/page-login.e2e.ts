import { newE2EPage } from '@stencil/core/testing';

describe('page-login', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-login></page-login>');

    const element = await page.find('page-login');
    expect(element).toHaveClass('hydrated');
  });
});
