import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-login';

describe('page-login', () => {
  it('builds', async () => {
    const { root } = await render(<page-login />);
    expect(root).toHaveClass('hydrated');
  });
});
