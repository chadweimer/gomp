import { newE2EPage } from '@stencil/core/testing';

describe('page-home', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-home></page-home>');

    const element = await page.find('page-home');
    expect(element).toHaveClass('hydrated');
  });
});
