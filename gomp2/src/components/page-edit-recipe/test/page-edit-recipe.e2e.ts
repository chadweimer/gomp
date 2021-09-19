import { newE2EPage } from '@stencil/core/testing';

describe('page-edit-recipe', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-edit-recipe></page-edit-recipe>');

    const element = await page.find('page-edit-recipe');
    expect(element).toHaveClass('hydrated');
  });
});
