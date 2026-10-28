import { fixture, html } from '@open-wc/testing';
import { describe, it, expect } from 'vitest';
import { Recipe, RecipeState } from '../../helpers/schema.gen';
import './recipe-print';
import { RecipePrint } from './recipe-print';

describe('recipe-print', () => {
  const baseRecipe: Recipe = {
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

  it('binds to recipe and renders heading', async () => {
    const el = await fixture<RecipePrint>(html`<recipe-print .recipe=${baseRecipe}></recipe-print>`);
    const heading = el.shadowRoot?.querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Some Recipe');
  });

  it('renders conditional fields when provided', async () => {
    const el = await fixture<RecipePrint>(html`<recipe-print .recipe=${baseRecipe}></recipe-print>`);
    let headers = el.shadowRoot?.querySelectorAll('h2');
    expect(headers).toHaveLength(0);

    el.recipe = {
      ...baseRecipe,
      servingSize: '4 servings',
      time: '30 mins',
      ingredients: 'Apples, Sugar',
      directions: 'Mix and bake',
      storageInstructions: 'Keep cool',
      sourceUrl: 'https://example.com'
    };
    await el.updateComplete;

    const meta = el.shadowRoot?.querySelector('.meta');
    expect(meta?.textContent).toContain('Servings: 4 servings');
    expect(meta?.textContent).toContain('Time: 30 mins');

    headers = el.shadowRoot?.querySelectorAll('h2');
    expect(headers).toHaveLength(4);
    const titles = Array.from(headers ?? []).map(h => h.textContent?.trim());
    expect(titles).toEqual(['Ingredients', 'Directions', 'Storage Instructions', 'Source']);
  });

  it('bind to main image', async () => {
    const recipe: Recipe = {
      ...baseRecipe,
      id: 1,
      mainImageName: 'image.jpg',
    };
    const el = await fixture<RecipePrint>(html`<recipe-print .recipe=${recipe}></recipe-print>`);
    const img = el.shadowRoot?.querySelector(`img[src='/uploads/recipes/${recipe.id}/thumbs/${recipe.mainImageName}']`);
    expect(img).not.toBeNull();
  });

  it('renders directions with unclickable inline image thumbnails when sentinels are present', async () => {
    const recipe: Recipe = {
      ...baseRecipe,
      id: 9,
      directions: '<p>Pour mix {{image:waffle.jpg}}</p>',
    };
    const el = await fixture<RecipePrint>(html`<recipe-print .recipe=${recipe}></recipe-print>`);
    const htmlViewer = el.shadowRoot?.querySelector('html-viewer');
    expect(htmlViewer).not.toBeNull();
    expect((htmlViewer as any).value).toBe(
      '<p>Pour mix <img src="/uploads/recipes/9/images/waffle.jpg" alt="waffle.jpg" data-image="waffle.jpg"></p>'
    );
  });
});

