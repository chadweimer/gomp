import { newE2EPage } from '@stencil/core/testing';

describe('recipe-editor', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<recipe-editor></recipe-editor>');

    const element = await page.find('recipe-editor');
    expect(element).toHaveClass('hydrated');
  });
});
