import { newSpecPage } from '@stencil/core/testing';
import { PageSearch } from '../page-search';

describe('page-search', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageSearch],
      html: '<page-search></page-search>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageSearch);
  });
});
