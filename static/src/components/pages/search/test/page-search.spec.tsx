import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-search';

describe('page-search', () => {
  it('builds', async () => {
    const { root } = await render(<page-search />);
    expect(root).toHaveClass('hydrated');
  });
});
