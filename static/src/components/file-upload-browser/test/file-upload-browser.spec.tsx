import { render, h, describe, it, expect } from '@stencil/vitest';
import '../file-upload-browser';

describe('file-upload-browser', () => {
  it('builds', async () => {
    const { root } = await render(<file-upload-browser></file-upload-browser>);
    expect(root).toHaveClass('hydrated');
  });
});
