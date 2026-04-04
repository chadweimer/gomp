import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-settings-searches', () => {
  it('builds', async () => {
    const { root } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
    expect(root).toHaveClass('hydrated');
  });
});
