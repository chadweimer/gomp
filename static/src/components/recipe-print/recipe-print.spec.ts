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
});

