import { newE2EPage } from '@stencil/core/testing';

describe('image-upload-browser', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<image-upload-browser></image-upload-browser>');

    const element = await page.find('image-upload-browser');
    expect(element).toHaveClass('hydrated');
  });
});
