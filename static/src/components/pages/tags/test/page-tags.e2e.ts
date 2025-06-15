import { newE2EPage } from '@stencil/core/testing';

describe('page-tags', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-tags></page-tags>');

    const element = await page.find('page-tags');
    expect(element).toHaveClass('hydrated');
  });
});
