import { newSpecPage } from '@stencil/core/testing';
import { PageAdmin } from '../page-admin';

describe('page-admin', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageAdmin],
      html: '<page-admin></page-admin>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageAdmin);
  });
});
