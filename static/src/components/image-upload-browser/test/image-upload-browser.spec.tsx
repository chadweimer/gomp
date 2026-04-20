import { render, h, describe, it, expect } from '@stencil/vitest';
import '../image-upload-browser';

describe('image-upload-browser', () => {
  it('builds', async () => {
    const { root } = await render(<image-upload-browser></image-upload-browser>);
    expect(root).toHaveClass('hydrated');
  });
});
