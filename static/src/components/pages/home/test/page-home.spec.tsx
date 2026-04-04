import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-home', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageHomeElement>(<page-home />);
    expect(root).toHaveClass('hydrated');
  });
});
