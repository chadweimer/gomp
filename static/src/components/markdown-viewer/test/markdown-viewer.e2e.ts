import { newE2EPage } from '@stencil/core/testing';

describe('markdown-viewer', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<markdown-viewer></markdown-viewer>');

    const element = await page.find('markdown-viewer');
    expect(element).toHaveClass('hydrated');
  });
});
