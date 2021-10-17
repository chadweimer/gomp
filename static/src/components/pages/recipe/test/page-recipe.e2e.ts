import { newE2EPage } from '@stencil/core/testing';

describe('page-view-recipe', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-view-recipe></page-view-recipe>');

    const element = await page.find('page-view-recipe');
    expect(element).toHaveClass('hydrated');
  });
});
