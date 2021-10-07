import { newE2EPage } from '@stencil/core/testing';

describe('tags-input', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<tags-input></tags-input>');

    const element = await page.find('tags-input');
    expect(element).toHaveClass('hydrated');
  });
});
