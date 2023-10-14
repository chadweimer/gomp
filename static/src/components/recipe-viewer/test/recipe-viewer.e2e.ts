import { newE2EPage } from '@stencil/core/testing';

describe('recipe-viewer', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<recipe-viewer></recipe-viewer>');

    const element = await page.find('recipe-viewer');
    expect(element).toHaveClass('hydrated');
  });
});
