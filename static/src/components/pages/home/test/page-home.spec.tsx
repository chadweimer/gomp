import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-home';

describe('page-home', () => {
  it('builds', async () => {
    const { root } = await render(<page-home />);
    expect(root).toHaveClass('hydrated');
  });
});
