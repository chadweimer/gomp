import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-login', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageLoginElement>(<page-login />);
    expect(root).toHaveClass('hydrated');
  });
});
