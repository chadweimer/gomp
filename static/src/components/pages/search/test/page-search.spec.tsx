import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-search', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageSearchElement>(<page-search />);
    expect(root).toHaveClass('hydrated');
  });
});
