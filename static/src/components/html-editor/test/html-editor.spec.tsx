import { render, h, describe, it, expect } from '@stencil/vitest';
import '../html-editor';

describe('html-editor', () => {
  it('builds', async () => {
    const { root } = await render(<html-editor />);
    expect(root).toHaveClass('hydrated');
  });
});
