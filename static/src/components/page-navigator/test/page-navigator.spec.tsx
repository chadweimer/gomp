import { newSpecPage } from '@stencil/core/testing';
import { PageNavigator } from '../page-navigator';

describe('page-navigator', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageNavigator],
      html: '<page-navigator></page-navigator>',
    });
    expect(page.rootInstance).toBeInstanceOf(PageNavigator);
  });
});
