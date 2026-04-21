import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-settings-preferences';

describe('page-settings-preferences', () => {
  it('builds', async () => {
    const { root } = await render(<page-settings-preferences />);
    expect(root).toHaveClass('hydrated');
  });
});
