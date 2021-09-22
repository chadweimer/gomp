import { newE2EPage } from '@stencil/core/testing';

describe('recipe-card', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<recipe-card></recipe-card>');

    const element = await page.find('recipe-card');
    expect(element).toHaveClass('hydrated');
  });
});
