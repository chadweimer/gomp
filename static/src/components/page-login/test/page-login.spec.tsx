import { newSpecPage } from '@stencil/core/testing';
import { PageLogin } from '../page-login';

describe('page-login', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [PageLogin],
      html: '<page-login></page-login>',
    });
    expect(page.root).toEqualHtml(`
      <page-login>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </page-login>
    `);
  });
});
