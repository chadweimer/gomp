import { render, h, describe, it, expect } from '@stencil/vitest';
import '../page-navigator';

describe('page-navigator', () => {
  it('renders', async () => {
    const { root } = await render(<page-navigator></page-navigator>);
    expect(root).toHaveClass('hydrated');
  });
});
