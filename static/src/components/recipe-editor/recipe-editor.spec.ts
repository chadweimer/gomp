import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../vitest.setup';
import { Recipe, RecipeState, UserSettings } from '../../helpers/schema.gen';
import './recipe-editor';
import { RecipeEditor } from './recipe-editor';

describe('recipe-editor', () => {
  let modalEl: HTMLIonModalElement;

  const mockSettings: UserSettings = {
    userId: 1,
    homeTitle: 'My Home',
    homeImageUrl: 'http://example.com/image.jpg',
    favoriteTags: ['breakfast', 'quick'],
  };

  const mockRecipe: Recipe = {
    id: 1,
    name: 'Pancakes',
    state: RecipeState.Active,
    rating: 3,
    servingSize: '4 servings',
    time: '20 minutes',
    nutritionInfo: '300 calories',
    ingredients: 'Flour, Milk, Eggs',
    directions: 'Mix and cook on griddle',
    storageInstructions: 'Refrigerate in container',
    sourceUrl: 'https://example.com/pancakes',
    mainImageName: 'pancakes.jpg',
    tags: ['breakfast', 'sweet'],
  };

  beforeEach(() => {
    fetchMocker.resetMocks();
    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/)) {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      return Promise.resolve(JSON.stringify({}));
    });
  });

  afterEach(() => {
    fetchMocker.resetMocks();
    modalEl.remove();
    vi.restoreAllMocks();
  });

  it('renders default state for new recipe', async () => {
    const el = await fixture<RecipeEditor>(html`<recipe-editor></recipe-editor>`);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('New Recipe');

    const fileInput = el.shadowRoot?.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
  });

  it('renders edit mode when recipe has id and hides initial file input', async () => {
    const el = await fixture<RecipeEditor>(html`<recipe-editor .recipe=${mockRecipe}></recipe-editor>`);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('Edit Recipe');

    const fileInput = el.shadowRoot?.querySelector('input[type="file"]');
    expect(fileInput).toBeNull();
  });

  it('dismisses modal on cancel', async () => {
    const el = await fixture<RecipeEditor>(html`<recipe-editor></recipe-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const cancelBtn = el.shadowRoot?.querySelector('ion-buttons[slot="secondary"] ion-button') as HTMLElement;
    cancelBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
  });

  it('dismisses modal with recipe on save', async () => {
    const el = await fixture<RecipeEditor>(html`<recipe-editor .recipe=${mockRecipe}></recipe-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const saveBtn = el.shadowRoot?.querySelector('ion-buttons[slot="primary"] ion-button') as HTMLElement;
    saveBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith(
      expect.objectContaining({ recipe: expect.objectContaining({ name: 'Pancakes' }) }),
      'save'
    );
  });
});

