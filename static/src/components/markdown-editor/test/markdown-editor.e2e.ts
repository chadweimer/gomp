import { newE2EPage } from '@stencil/core/testing';

describe('markdown-editor', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<markdown-editor></markdown-editor>');

    const element = await page.find('markdown-editor');
    expect(element).toHaveClass('hydrated');
  });
});
