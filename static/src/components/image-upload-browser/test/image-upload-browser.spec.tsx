import { newSpecPage } from '@stencil/core/testing';
import { ImageUploadBrowser } from '../image-upload-browser';

describe('image-upload-browser', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [ImageUploadBrowser],
      html: '<image-upload-browser></image-upload-browser>',
    });
    expect(page.root).toEqualHtml(`
      <image-upload-browser>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </image-upload-browser>
    `);
  });
});
