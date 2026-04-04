import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-admin-maintenance', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
    expect(root).toHaveClass('hydrated');
  });
});
