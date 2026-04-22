import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-settings';

describe('page-settings', () => {
  it('builds', async () => {
    const { root } = await render(<page-settings />);
    expect(root).toHaveClass('hydrated');
  });
});
