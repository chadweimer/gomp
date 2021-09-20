import { newE2EPage } from '@stencil/core/testing';

describe('page-recipes', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-recipes></page-recipes>');

    const element = await page.find('page-recipes');
    expect(element).toHaveClass('hydrated');
  });
});
