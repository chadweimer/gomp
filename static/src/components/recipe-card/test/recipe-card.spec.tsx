import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { RecipeCard } from '../recipe-card';
import { RecipeCompact } from '../../../generated';

describe('recipe-card', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [RecipeCard],
      html: '<recipe-card></recipe-card>',
    });
    expect(page.rootInstance).toBeInstanceOf(RecipeCard);
  });

  it('no initial value', async () => {
    const page = await newSpecPage({
      components: [RecipeCard],
      html: '<recipe-card></recipe-card>',
    });
    const component = page.rootInstance as RecipeCard;
    expect(component.recipe.name).toEqual('');
    const image = page.root.shadowRoot.querySelector('img');
    expect(image).toBeNull();
    const node = page.root.shadowRoot.querySelector('.no-overflow > .single-line');
    expect(node).not.toBeNull();
    expect(node).toEqualText('');
    const rating = page.root.shadowRoot.querySelector('five-star-rating');
    expect(rating).not.toBeNull();
    expect(rating).toEqualAttribute('value', 0);
  });

  it('bind to recipe', async () => {
    const recipe: RecipeCompact = {
      name: 'Some Recipe',
      averageRating: 2,
    };
    const page = await newSpecPage({
      components: [RecipeCard],
      template: () => (<recipe-card recipe={recipe}></recipe-card>),
    });
    const component = page.rootInstance as RecipeCard;
    expect(component.recipe).toEqual(recipe);
    const image = page.root.shadowRoot.querySelector('img');
    expect(image).toBeNull();
    const node = page.root.shadowRoot.querySelector('.no-overflow > .single-line');
    expect(node).not.toBeNull();
    expect(node).toEqualText(recipe.name);
    const rating = page.root.shadowRoot.querySelector('five-star-rating');
    expect(rating).not.toBeNull();
    expect(rating).toEqualAttribute('value', recipe.averageRating);
  });
});
