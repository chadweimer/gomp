import { newE2EPage } from '@stencil/core/testing';

describe('page-navigator', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<page-navigator></page-navigator>');

    const element = await page.find('page-navigator');
    expect(element).toHaveClass('hydrated');
  });
});
