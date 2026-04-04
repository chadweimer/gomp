import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-admin', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageAdminElement>(<page-admin />);
    expect(root).toHaveClass('hydrated');
  });
});
