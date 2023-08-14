import { RecipeStateSelector } from '../recipe-state-selector';

describe('recipe-state-selector', () => {
  it('builds', () => {
    expect(new RecipeStateSelector()).toBeTruthy();
  });
});
