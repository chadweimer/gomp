import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-admin';

describe('page-admin', () => {
  it('builds', async () => {
    const { root } = await render(<page-admin />);
    expect(root).toHaveClass('hydrated');
  });
});
