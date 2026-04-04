import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-settings', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageSettingsElement>(<page-settings />);
    expect(root).toHaveClass('hydrated');
  });
});
