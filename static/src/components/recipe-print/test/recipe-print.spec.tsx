import { render, h, describe, it, expect } from '@stencil/vitest';
import { Recipe, RecipeState } from '../../../helpers/schema.gen';
import '../recipe-print';

describe('recipe-print', () => {
  it('builds', async () => {
    const { root } = await render(<recipe-print />);
    expect(root).toHaveClass('hydrated');
  });

  it('bind to recipe', async () => {
    const recipe: Recipe = {
      name: 'Some Recipe',
      state: RecipeState.Active,
      rating: 0,
      servingSize: '',
      time: '',
      ingredients: '',
      directions: '',
      nutritionInfo: '',
      storageInstructions: '',
      sourceUrl: '',
      mainImageName: '',
      tags: []
    };
    const { root } = await render(<recipe-print recipe={recipe}></recipe-print>);
    expect(root).toHaveProperty('recipe', recipe);
    const heading = root.shadowRoot?.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading).toEqualText(recipe.name);
  });

  it('hide and show fields', async () => {
    const recipe: Recipe = {
      name: 'Some Recipe',
      state: RecipeState.Active,
      rating: 0,
      servingSize: '',
      time: '',
      ingredients: '',
      directions: '',
      nutritionInfo: '',
      storageInstructions: '',
      sourceUrl: '',
      mainImageName: '',
      tags: []
    };
    const { root, waitForChanges, setProps } = await render<HTMLRecipePrintElement>(<recipe-print recipe={recipe}></recipe-print>);
    let items = root.shadowRoot?.querySelectorAll('h2');

    // By default, there should be no items since the fields except name are null
    expect(items).toHaveLength(0);
    const heading = root.shadowRoot?.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading).toEqualText(recipe.name);
    let subtitle = root.shadowRoot?.querySelector('.meta');
    expect(subtitle).not.toHaveTextContent('Servings:');
    expect(subtitle).not.toHaveTextContent('Time:');

    // Serving Size
    await setProps({ recipe: { ...recipe, servingSize: 'serving size' } });
    await waitForChanges();
    subtitle = root.shadowRoot?.querySelector('.meta');
    expect(subtitle).toHaveTextContent('Servings: serving size');

    // Time
    await setProps({ recipe: { ...recipe, time: 'time' } });
    await waitForChanges();
    subtitle = root.shadowRoot?.querySelector('.meta');
    expect(subtitle).toHaveTextContent('Time: time');

    // Ingredients
    await setProps({ recipe: { ...recipe, ingredients: 'ingredients' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('h2');
    expect(items).toHaveLength(1);
    let node = items?.[0].parentElement?.lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualAttribute('value', root.recipe!.ingredients);

    // Directions
    await setProps({ recipe: { ...recipe, directions: 'directions' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('h2');
    expect(items).toHaveLength(1);
    node = items?.[0].parentElement?.lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualAttribute('value', root.recipe!.directions);

    // Nutrition Info should NOT be shown
    await setProps({ recipe: { ...recipe, nutritionInfo: 'nutrition' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('h2');
    expect(items).toHaveLength(0);

    // Storage Instructions
    await setProps({ recipe: { ...recipe, storageInstructions: 'storage' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('h2');
    expect(items).toHaveLength(1);
    node = items?.[0].parentElement?.lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualAttribute('value', root.recipe!.storageInstructions);

    // Source URL
    await setProps({ recipe: { ...recipe, sourceUrl: 'http://some.recipe/' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('h2');
    expect(items).toHaveLength(1);
    node = items?.[0].parentElement?.lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualText(root.recipe!.sourceUrl);
  });

  it('bind to main image', async () => {
    const recipe: Recipe = {
      id: 1,
      name: 'recipe with image',
      state: RecipeState.Active,
      rating: 0,
      servingSize: '',
      time: '',
      nutritionInfo: '',
      ingredients: '',
      directions: '',
      storageInstructions: '',
      sourceUrl: '',
      mainImageName: 'image.jpg',
      tags: []
    };
    const { root } = await render(<recipe-print recipe={recipe}></recipe-print>);
    const img = root.shadowRoot?.querySelector(`img[src='/uploads/recipes/${recipe.id}/thumbs/${recipe.mainImageName}']`);
    expect(img).not.toBeNull();
  });

  it('renders directions with unclickable inline image thumbnails when sentinels are present', async () => {
    const recipe: Recipe = {
      id: 9,
      name: 'Waffles',
      state: RecipeState.Active,
      rating: 4,
      servingSize: '2',
      time: '15m',
      ingredients: '',
      directions: '<p>Pour mix {{image:waffle.jpg}}</p>',
      nutritionInfo: '',
      storageInstructions: '',
      sourceUrl: '',
      mainImageName: '',
      tags: [],
    };
    const { root } = await render(<recipe-print recipe={recipe} />);
    const htmlViewer = root.shadowRoot?.querySelector('html-viewer');
    expect(htmlViewer).not.toBeNull();
    expect(htmlViewer).toEqualAttribute(
      'value',
      '<p>Pour mix <img loading="lazy" src="/uploads/recipes/9/thumbs/waffle.jpg" alt="waffle.jpg"></p>',
    );
  });
});
