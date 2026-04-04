import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-admin-configuration', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageAdminConfigurationElement>(<page-admin-configuration />);
    expect(root).toHaveClass('hydrated');
  });
});
