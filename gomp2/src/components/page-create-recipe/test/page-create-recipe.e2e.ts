import { newE2EPage } from '@stencil/core/testing';

describe('page-create-recipe', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-create-recipe></page-create-recipe>');

    const element = await page.find('page-create-recipe');
    expect(element).toHaveClass('hydrated');
  });
});
