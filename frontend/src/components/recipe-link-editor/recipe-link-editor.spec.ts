import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../vitest.setup';
import { RecipeCompact, RecipeState, SearchResult } from '../../helpers/schema.gen';
import { clearState } from '../../stores/state';
import './recipe-link-editor';
import { RecipeLinkEditor } from './recipe-link-editor';

describe('recipe-link-editor', () => {
  let modalEl: HTMLIonModalElement;

  const mockRecipes: RecipeCompact[] = [
    {
      id: 1,
      name: 'Spaghetti Carbonara',
      state: RecipeState.Active,
      rating: 5,
      mainImageName: 'carbonara.jpg',
      tags: ['pasta'],
    },
    {
      id: 2,
      name: 'Parent Recipe',
      state: RecipeState.Active,
      rating: 4,
      mainImageName: '',
      tags: ['main'],
    },
    {
      id: 3,
      name: 'Chicken Alfredo',
      state: RecipeState.Active,
      rating: 4.5,
      mainImageName: '',
      tags: ['chicken'],
    },
  ];

  beforeEach(() => {
    fetchMocker.resetMocks();
    clearState();

    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(
          JSON.stringify({
            total: mockRecipes.length,
            recipes: mockRecipes,
          } as SearchResult)
        );
      }
      return Promise.resolve(JSON.stringify({}));
    });
  });

  afterEach(() => {
    fetchMocker.resetMocks();
    clearState();
    modalEl.remove();
    vi.restoreAllMocks();
  });

  it('builds and renders default state', async () => {
    const el = await fixture<RecipeLinkEditor>(html`<recipe-link-editor></recipe-link-editor>`);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('Add Link');

    const toggleBtn = el.shadowRoot?.querySelector('ion-list-header ion-button');
    expect(toggleBtn?.textContent?.trim()).toBe('Include Archived');
  });

  it('searches when query is entered and excludes parent recipe', async () => {
    const el = await fixture<RecipeLinkEditor>(html`<recipe-link-editor .parentRecipeId=${2}></recipe-link-editor>`);

    // Set query with 2+ characters
    (el as any).query = 'ch';
    await (el as any).onSearchInputChanged();
    await el.updateComplete;

    // Matching recipes should exclude parent recipe (id: 2)
    const items = el.shadowRoot?.querySelectorAll('ion-radio-group ion-item');
    expect(items).toHaveLength(2);
  });

  it('dismisses modal on save when recipe is selected', async () => {
    const el = await fixture<RecipeLinkEditor>(html`<recipe-link-editor .parentRecipeId=${2}></recipe-link-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    (el as any).selectedRecipeId = 1;
    const saveBtn = el.shadowRoot?.querySelector('ion-buttons[slot="primary"] ion-button') as HTMLElement;
    saveBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith({ recipeId: 1 }, 'save');
  });

  it('dismisses modal on cancel', async () => {
    const el = await fixture<RecipeLinkEditor>(html`<recipe-link-editor></recipe-link-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const cancelBtn = el.shadowRoot?.querySelector('ion-buttons[slot="secondary"] ion-button') as HTMLElement;
    cancelBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
  });
});
