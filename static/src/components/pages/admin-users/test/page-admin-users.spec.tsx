import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-admin-users', () => {
  it('builds', async () => {
    const { root } = await render(<page-admin-users />);
    expect(root).toHaveClass('hydrated');
  });
});
