import { newE2EPage } from '@stencil/core/testing';

describe('search-filter-editor', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<search-filter-editor></search-filter-editor>');

    const element = await page.find('search-filter-editor');
    expect(element).toHaveClass('hydrated');
  });
});
