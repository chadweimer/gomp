import { newSpecPage } from '@stencil/core/testing';
import { TagsInput } from '../tags-input';

describe('tags-input', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [TagsInput],
      html: '<tags-input></tags-input>',
    });
    expect(page.root).toEqualHtml(`
      <tags-input>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </tags-input>
    `);
  });
});
