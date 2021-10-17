import { newE2EPage } from '@stencil/core/testing';

describe('page-search', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-search></page-search>');

    const element = await page.find('page-search');
    expect(element).toHaveClass('hydrated');
  });
});
