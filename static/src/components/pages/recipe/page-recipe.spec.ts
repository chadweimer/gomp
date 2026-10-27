import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, Note, Recipe, RecipeCompact, RecipeState } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-recipe';
import { PageRecipe } from './page-recipe';

describe('page-recipe', () => {
  const mockRecipe: Recipe = {
    id: 1,
    name: 'Pancakes',
    state: RecipeState.Active,
    rating: 3,
    servingSize: '4',
    time: '30 minutes',
    nutritionInfo: 'Nutrition info here',
    ingredients: 'Flour, Milk, Eggs',
    directions: 'Mix and fry',
    storageInstructions: 'Keep cool',
    sourceUrl: 'https://example.com/pancakes',
    mainImageName: 'pancakes.jpg',
    tags: ['breakfast', 'sweet'],
  };

  const mockLinks: RecipeCompact[] = [
    { id: 2, name: 'Waffles', state: RecipeState.Active, mainImageName: 'waffles.jpg', rating: 4, tags: ['breakfast'] },
  ];

  const mockImages: string[] = ['pancakes.jpg', 'extra.jpg'];
  const mockNotes: Note[] = [{ id: 10, recipeId: 1, text: 'Use fresh eggs' }];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMocker.resetMocks();
    clearState();

    state.currentUser = { id: 1, username: 'admin', accessLevel: AccessLevel.Admin };

    fetchMocker.mockResponse((req: Request) => {
      const url = req.url;
      if (url.match(/\/recipes\/\d+$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockRecipe));
      }
      if (url.match(/\/recipes\/\d+\/links$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockLinks));
      }
      if (url.match(/\/recipes\/\d+\/images$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockImages));
      }
      if (url.match(/\/recipes\/\d+\/notes$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockNotes));
      }
      if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify({ total: 1, recipes: [mockRecipe] }));
      }
      return Promise.resolve(JSON.stringify({}));
    });
  });

  afterEach(() => {
    clearState();
    vi.restoreAllMocks();
  });

  it('builds and renders recipe details via recipe-viewer', async () => {
    const el = await fixture<PageRecipe>(html`<page-recipe .recipeId=${1}></page-recipe>`);
    await el.load();
    await el.updateComplete;

    const viewer = el.querySelector('recipe-viewer');
    expect(viewer).not.toBeNull();
    expect((viewer as any).recipe?.name).toBe('Pancakes');
  });

  it('renders uploaded images in pictures section', async () => {
    const el = await fixture<PageRecipe>(html`<page-recipe .recipeId=${1}></page-recipe>`);
    await el.load();
    await el.updateComplete;

    const cards = el.querySelectorAll('ion-card.image');
    expect(cards).toHaveLength(2);
  });

  it('renders notes section via note-card', async () => {
    const el = await fixture<PageRecipe>(html`<page-recipe .recipeId=${1}></page-recipe>`);
    await el.load();
    await el.updateComplete;

    const noteCards = el.querySelectorAll('note-card');
    expect(noteCards).toHaveLength(1);
    expect((noteCards[0] as any).note?.text).toBe('Use fresh eggs');
  });

  it('updates rating on recipe', async () => {
    const el = await fixture<PageRecipe>(html`<page-recipe .recipeId=${1}></page-recipe>`);
    await el.load();
    await el.updateComplete;

    const viewer = el.querySelector('recipe-viewer') as HTMLElement;
    viewer.dispatchEvent(new CustomEvent('ratingSelected', { detail: 5, bubbles: true }));

    const requests = fetchMocker.requests();
    const patchReq = requests.find((r) => r.method === 'PATCH' && r.url.endsWith('/recipes/1'));
    expect(patchReq).toBeDefined();
  });

  it('renders bottom toolbar actions for Editor/Admin role', async () => {
    const el = await fixture<PageRecipe>(html`<page-recipe .recipeId=${1}></page-recipe>`);
    await el.load();
    await el.updateComplete;

    const buttons = el.querySelectorAll('ion-footer ion-button');
    expect(buttons.length).toBeGreaterThan(0);

    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts).toContain('Edit');
    expect(buttonTexts).toContain('Add Note');
    expect(buttonTexts).toContain('Upload Picture');
  });
});
