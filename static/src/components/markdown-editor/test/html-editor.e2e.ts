import { newE2EPage } from '@stencil/core/testing';

describe('html-editor', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<html-editor></html-editor>');

    const element = await page.find('html-editor');
    expect(element).toHaveClass('hydrated');
  });
});
