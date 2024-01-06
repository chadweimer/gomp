import { newSpecPage } from '@stencil/core/testing';
import { AppRoot } from '../app-root';

describe('page-admin', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [AppRoot],
      html: '<app-root></app-root>',
    });
    expect(page.rootInstance).toBeInstanceOf(AppRoot);
  });
});
