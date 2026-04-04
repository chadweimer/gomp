import { render, h, describe, it, expect } from '@stencil/vitest';

describe('page-admin', () => {
  it('builds', async () => {
    const { root } = await render(<app-root />);
    expect(root).toEqualLightHtml(`
      <app-root class="hydrated"></app-root>
    `);
  });
});
