import { newSpecPage } from '@stencil/core/testing';
import { SearchFilterEditor } from '../search-filter-editor';

describe('search-filter-editor', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [SearchFilterEditor],
      html: '<search-filter-editor></search-filter-editor>',
    });
    expect(page.rootInstance).toBeInstanceOf(SearchFilterEditor);
  });
});
