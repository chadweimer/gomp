import { newE2EPage } from '@stencil/core/testing';

describe('page-admin', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-admin></page-admin>');

    const element = await page.find('page-admin');
    expect(element).toHaveClass('hydrated');
  });
});
