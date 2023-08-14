import { RecipeCard } from '../recipe-card';

describe('recipe-card', () => {
  it('renders', async () => {
    expect(new RecipeCard()).toBeTruthy();
  });
});
