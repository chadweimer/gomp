import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-admin-configuration';

describe('page-admin-configuration', () => {
  it('builds', async () => {
    const { root } = await render(<page-admin-configuration />);
    expect(root).toHaveClass('hydrated');
  });
});
