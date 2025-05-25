import { newE2EPage } from '@stencil/core/testing';

describe('html-viewer', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<html-viewer></html-viewer>');

    const element = await page.find('html-viewer');
    expect(element).toHaveClass('hydrated');
  });
});
