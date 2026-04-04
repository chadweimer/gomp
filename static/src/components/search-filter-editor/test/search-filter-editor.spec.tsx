import { render, h, describe, it, expect } from '@stencil/vitest';

describe('search-filter-editor', () => {
  it('builds', async () => {
    const { root } = await render(<search-filter-editor />);
    expect(root).toEqualLightHtml(`
      <search-filter-editor class="hydrated"></search-filter-editor>
    `);
    const savedSearchLoader = root.shadowRoot?.querySelector('#savedSearchLoader');
    expect(savedSearchLoader).toBeNull();
  });
});

describe('shows saved filter loader', () => {
  it('builds', async () => {
    const { root } = await render(<search-filter-editor show-saved-loader></search-filter-editor>);
    expect(root).toHaveProperty('showSavedLoader', true);
    const savedSearchLoader = root.shadowRoot?.querySelector('#savedSearchLoader');
    expect(savedSearchLoader).not.toBeNull();
  });
});
