import { newE2EPage } from '@stencil/core/testing';

describe('recipe-state-selector', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<recipe-state-selector></recipe-state-selector>');

    const element = await page.find('recipe-state-selector');
    expect(element).toHaveClass('hydrated');
  });
});
