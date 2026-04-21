import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-admin-maintenance';

describe('page-admin-maintenance', () => {
  it('builds', async () => {
    const { root } = await render(<page-admin-maintenance />);
    expect(root).toHaveClass('hydrated');
  });
});
