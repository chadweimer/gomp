import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-navigator', () => {
  it('renders', async () => {
    const { root } = await render(<page-navigator></page-navigator>);
    expect(root).toEqualLightHtml(`
      <page-navigator class="hydrated"></page-navigator>
    `);
  });
});
