import { render, h, describe, it, expect } from '@stencil/vitest';

describe('image-upload-browser', () => {
  it('builds', async () => {
    const { root } = await render(<image-upload-browser></image-upload-browser>);
    expect(root).toEqualLightHtml(`
      <image-upload-browser class="hydrated"></image-upload-browser>
    `);
  });
});
