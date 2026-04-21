import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-settings-searches';

describe('page-settings-searches', () => {
  it('builds', async () => {
    const { root } = await render(<page-settings-searches />);
    expect(root).toHaveClass('hydrated');
  });
});
