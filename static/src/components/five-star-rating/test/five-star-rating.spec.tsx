import { newSpecPage } from '@stencil/core/testing';
import { FiveStarRating } from '../five-star-rating';

describe('five-star-rating', () => {
  it('builds', () => {
    expect(new FiveStarRating()).toBeTruthy();
  });
});
