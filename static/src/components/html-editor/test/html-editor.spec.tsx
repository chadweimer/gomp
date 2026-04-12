import { render, h, describe, it, expect } from '@stencil/vitest';

describe('html-editor', () => {
  it('builds', async () => {
    const { root } = await render(<html-editor />);
    expect(root).toHaveClass('hydrated');
  });
});
