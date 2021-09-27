import { newE2EPage } from '@stencil/core/testing';

describe('image-uploader', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<image-uploader></image-uploader>');

    const element = await page.find('image-uploader');
    expect(element).toHaveClass('hydrated');
  });
});
