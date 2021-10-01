import { newSpecPage } from '@stencil/core/testing';
import { FiveStarRating } from '../five-star-rating';

describe('five-star-rating', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [FiveStarRating],
      html: `<five-star-rating></five-star-rating>`,
    });
    expect(page.root).toEqualHtml(`
      <five-star-rating>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </five-star-rating>
    `);
  });
});
