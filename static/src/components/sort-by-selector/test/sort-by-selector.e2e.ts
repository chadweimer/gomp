import { newE2EPage } from '@stencil/core/testing';

describe('sort-by-selector', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<sort-by-selector></sort-by-selector>');

    const element = await page.find('sort-by-selector');
    expect(element).toHaveClass('hydrated');
  });
});
