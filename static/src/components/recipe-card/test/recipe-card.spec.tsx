import { render, h, describe, it, expect } from '@stencil/vitest';
import { RecipeCompact } from '../../../generated';

describe('recipe-card', () => {
  it('builds', async () => {
    const { root } = await render(<recipe-card />);
    expect(root).toEqualLightHtml(`
      <recipe-card class="hydrated"></recipe-card>
    `);
  });

  it('no initial value', async () => {
    const { root } = await render<HTMLRecipeCardElement>(<recipe-card />);
    expect(root.recipe.name).toEqual('');
    const image = root.shadowRoot?.querySelector('ion-img.hidden');
    expect(image).not.toBeNull();
    const node = root.shadowRoot?.querySelector('ion-card-title');
    expect(node).not.toBeNull();
    expect(node).toEqualText('');
    const rating = root.shadowRoot?.querySelector('five-star-rating');
    expect(rating).not.toBeNull();
    expect(rating).toHaveProperty('value', 0);
  });

  it('bind to recipe', async () => {
    const recipe: RecipeCompact = {
      name: 'Some Recipe',
      averageRating: 2,
    };
    const { root } = await render(<recipe-card recipe={recipe} />);
    expect(root).toHaveProperty('recipe', recipe);
    const image = root.shadowRoot?.querySelector('ion-img.hidden');
    expect(image).not.toBeNull();
    const node = root.shadowRoot?.querySelector('ion-card-title');
    expect(node).not.toBeNull();
    expect(node).toEqualText(recipe.name);
    const rating = root.shadowRoot?.querySelector('five-star-rating');
    expect(rating).not.toBeNull();
    expect(rating).toHaveProperty('value', recipe.averageRating);
  });
});
