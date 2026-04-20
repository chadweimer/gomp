import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-settings-security';

describe('page-settings-security', () => {
  it('builds', async () => {
    const { root } = await render(<page-settings-security />);
    expect(root).toHaveClass('hydrated');
  });
});
