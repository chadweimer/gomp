import { newSpecPage } from '@stencil/core/testing';
import { FiveStarRating } from '../five-star-rating';

describe('five-star-rating', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [FiveStarRating],
      html: '<five-star-rating></five-star-rating>',
    });
    expect(page.rootInstance).toBeInstanceOf(FiveStarRating);
  });

  it('renders', async () => {
    const page = await newSpecPage({
      components: [FiveStarRating],
      html: '<five-star-rating></five-star-rating>',
    });
    expect(page.root.shadowRoot).toEqualHtml(`
      <ion-icon class="icon whole" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon" icon="star" size="small"></ion-icon>
    `);
  });

  it('renders value', async () => {
    const page = await newSpecPage({
      components: [FiveStarRating],
      html: '<five-star-rating value="3.5"></five-star-rating>',
    });
    expect(page.root.shadowRoot).toEqualHtml(`
      <ion-icon class="icon whole" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon selected" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole selected" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon selected" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole selected" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon selected" icon="star" size="small"></ion-icon>
      <ion-icon class="icon whole selected" icon="star" size="small"></ion-icon>
      <ion-icon class="half icon selected" icon="star" size="small"></ion-icon>
    `);
  });
});
