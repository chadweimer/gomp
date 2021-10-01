import { newE2EPage } from '@stencil/core/testing';

describe('five-star-rating', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<five-star-rating></five-star-rating>');

    const element = await page.find('five-star-rating');
    expect(element).toHaveClass('hydrated');
  });
});
