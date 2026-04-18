import { render, h, describe, it, expect } from '@stencil/vitest';

describe('recipe-link-editor', () => {
  it('builds', async () => {
    const { root } = await render(<recipe-link-editor />);
    expect(root).toHaveClass('hydrated');
  });
});
