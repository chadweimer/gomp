import { newSpecPage } from '@stencil/core/testing';
import { UserEditor } from '../user-editor';

describe('user-editor', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [UserEditor],
      html: '<user-editor></user-editor>',
    });
    expect(page.root).toEqualHtml(`
      <user-editor>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </user-editor>
    `);
  });
});
