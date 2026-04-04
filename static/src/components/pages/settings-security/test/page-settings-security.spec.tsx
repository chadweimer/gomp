import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-settings-security', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageSettingsSecurityElement>(<page-settings-security />);
    expect(root).toHaveClass('hydrated');
  });
});
