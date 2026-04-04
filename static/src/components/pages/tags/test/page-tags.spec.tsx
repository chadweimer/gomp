import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-tags', () => {
  it('builds', async () => {
    const { root } = await render(<page-tags />);
    expect(root).toHaveClass('hydrated');
    // Should not render any tag items
    const items = root.querySelectorAll('ion-item');
    expect(items.length).toBe(0);
  });
});
