import { newE2EPage } from '@stencil/core/testing';

describe('recipe-link-editor', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<recipe-link-editor></recipe-link-editor>');

    const element = await page.find('recipe-link-editor');
    expect(element).toHaveClass('hydrated');
  });
});
