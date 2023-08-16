import { newSpecPage } from '@stencil/core/testing';
import { ImageUploadBrowser } from '../image-upload-browser';

describe('image-upload-browser', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [ImageUploadBrowser],
      html: '<image-upload-browser></image-upload-browser>',
    });
    expect(page.rootInstance).toBeInstanceOf(ImageUploadBrowser);
  });
});
