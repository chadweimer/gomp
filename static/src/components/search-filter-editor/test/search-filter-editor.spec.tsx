import { newSpecPage } from '@stencil/core/testing';
import { SearchFilterEditor } from '../search-filter-editor';

describe('search-filter-editor', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [SearchFilterEditor],
      html: '<search-filter-editor></search-filter-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(SearchFilterEditor);
    const savedSearchLoader = page.root.shadowRoot.querySelector('#savedSearchLoader');
    expect(savedSearchLoader).toBeNull();
  });
});

describe('shows saved filter loader', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [SearchFilterEditor],
      html: '<search-filter-editor show-saved-loader></search-filter-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(SearchFilterEditor);
    const component = page.rootInstance as SearchFilterEditor;
    expect(component.showSavedLoader).toEqual(true);
    const savedSearchLoader = page.root.shadowRoot.querySelector('#savedSearchLoader');
    expect(savedSearchLoader).not.toBeNull();
  });
});
