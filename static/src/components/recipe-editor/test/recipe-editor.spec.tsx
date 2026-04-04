import { render, h, describe, it, expect } from '@stencil/vitest';

describe('recipe-editor', () => {
  it('builds', async () => {
    const { root } = await render(<recipe-editor />);
    expect(root).toEqualLightHtml(`
      <recipe-editor class="hydrated"></recipe-editor>
    `);
  });
});
