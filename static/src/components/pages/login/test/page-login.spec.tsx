import { newSpecPage } from '@stencil/core/testing';
import { PageLogin } from '../page-login';

describe('page-login', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [PageLogin],
      html: '<page-login></page-login>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageLogin);
  });
});
