import { newSpecPage } from '@stencil/core/testing';
import { PageHome } from '../page-home';

describe('page-home', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageHome],
      html: '<page-home></page-home>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageHome);
  });
});
