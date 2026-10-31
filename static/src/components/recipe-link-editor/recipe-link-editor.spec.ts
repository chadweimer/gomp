import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../vitest.setup';
import { RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import { clearState } from '../../stores/state';
import './recipe-link-editor';
import { RecipeLinkEditor } from './recipe-link-editor';

describe('recipe-link-editor', () => {
  const originalFetch = globalThis.fetch;

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

  async function createRecipeLinkEditor(template = html`<recipe-link-editor></recipe-link-editor>`) {
    const modal = await fixture<HTMLIonModalElement>(html`
      <ion-modal>
        ${template}
      </ion-modal>
    `);
    modal.dismiss = vi.fn().mockResolvedValue(true);
    const el = modal.querySelector<RecipeLinkEditor>('recipe-link-editor')!;
    await el.updateComplete;
    return { modal, el };
  }

  beforeEach(() => {
    fetchMocker.resetMocks();
    clearState();

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(
          JSON.stringify({
            total: mockRecipes.length,
            recipes: mockRecipes,
          })
        );
      }
      return Promise.resolve('{}');
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    vi.restoreAllMocks();
  });

  it('builds and renders default state', async () => {
    const { el } = await createRecipeLinkEditor();

    const title = el.renderRoot.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('Add Link');

    const input = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('');

    const toggleBtn = el.renderRoot.querySelector('ion-list-header ion-button');
    expect(toggleBtn?.textContent?.trim()).toBe('Include Archived');
  });

  describe('search query input', () => {
    it('does not search and clears results when query has fewer than 2 characters', async () => {
      const { el } = await createRecipeLinkEditor();
      const searchInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="search"]');

      if (searchInput) {
        searchInput.value = 'a';
        searchInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'a' } }));
      }
      await new Promise(r => setTimeout(r, 20));
      await el.updateComplete;

      const items = el.renderRoot.querySelectorAll('ion-radio-group ion-item');
      expect(items).toHaveLength(0);
    });

    it('searches recipes and filters out parent recipe when query has 2 or more characters', async () => {
      let capturedUrl = '';
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
          capturedUrl = req.url;
          return Promise.resolve(
            JSON.stringify({
              total: mockRecipes.length,
              recipes: mockRecipes,
            })
          );
        }
        return Promise.resolve('{}');
      });

      const { el } = await createRecipeLinkEditor(
        html`<recipe-link-editor .parentRecipeId=${2}></recipe-link-editor>`
      );
      const searchInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="search"]');

      if (searchInput) {
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'pasta' } }));
      }
      await new Promise(r => setTimeout(r, 20));
      await el.updateComplete;

      expect(capturedUrl).toContain('q=pasta');

      // Parent recipe (id: 2) should be excluded, leaving 2 recipes
      const items = el.renderRoot.querySelectorAll('ion-radio-group ion-item');
      expect(items).toHaveLength(2);

      // Verify recipe names
      const radios = el.renderRoot.querySelectorAll('ion-radio');
      expect(radios?.[0].textContent?.trim()).toBe('Spaghetti Carbonara');
      expect(radios?.[1].textContent?.trim()).toBe('Chicken Alfredo');

      // Verify thumbnail for recipe with mainImageName
      const img = items?.[0]?.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('/uploads/recipes/1/thumbs/carbonara.jpg');
    });
  });

  describe('archived filter toggle', () => {
    it('toggles includeArchived and triggers search with archived state', async () => {
      let lastUrl = '';
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
          lastUrl = req.url;
          return Promise.resolve(
            JSON.stringify({
              total: mockRecipes.length,
              recipes: mockRecipes,
            })
          );
        }
        return Promise.resolve('{}');
      });

      const { el } = await createRecipeLinkEditor();
      const searchInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'pasta' } }));
      }
      await new Promise(r => setTimeout(r, 20));
      await el.updateComplete;

      let toggleBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-list-header ion-button');
      expect(toggleBtn?.textContent?.trim()).toBe('Include Archived');

      toggleBtn?.click();
      await new Promise(r => setTimeout(r, 20));
      await el.updateComplete;

      toggleBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-list-header ion-button');
      expect(toggleBtn?.textContent?.trim()).toBe('Exclude Archived');
      expect(lastUrl).toContain(RecipeState.Archived);

      // Toggle back to exclude
      toggleBtn?.click();
      await new Promise(r => setTimeout(r, 20));
      await el.updateComplete;

      toggleBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-list-header ion-button');
      expect(toggleBtn?.textContent?.trim()).toBe('Include Archived');
    });
  });

  describe('recipe selection', () => {
    it('updates selected recipe on radio group ionChange', async () => {
      const { el } = await createRecipeLinkEditor();
      const searchInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'pasta' } }));
      }
      await new Promise(r => setTimeout(r, 20));
      await el.updateComplete;

      const radioGroup = el.renderRoot.querySelector('ion-radio-group');
      radioGroup?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 1 } }));
      await el.updateComplete;

      expect((el as unknown as { selectedRecipeId: number | null }).selectedRecipeId).toBe(1);
    });
  });

  describe('save and cancel actions', () => {
    it('does not dismiss on save if no recipe is selected', async () => {
      const { modal, el } = await createRecipeLinkEditor();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const searchInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
      }

      const form = el.renderRoot.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await el.updateComplete;

      expect(setCustomValiditySpy).toHaveBeenCalledWith('A recipe must be selected');
      expect(modal.dismiss).not.toHaveBeenCalled();
    });

    it('dismisses modal with selected recipeId when valid', async () => {
      const { modal, el } = await createRecipeLinkEditor();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const searchInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'pasta' } }));
        searchInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
      }
      await new Promise(r => setTimeout(r, 20));
      await el.updateComplete;

      const radioGroup = el.renderRoot.querySelector('ion-radio-group');
      radioGroup?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 3 } }));
      await el.updateComplete;

      const saveBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await el.updateComplete;

      expect(setCustomValiditySpy).toHaveBeenCalledWith('');
      expect(modal.dismiss).toHaveBeenCalledWith({ recipeId: 3 }, 'save');
    });

    it('dismisses modal with cancel role when Cancel is clicked', async () => {
      const { modal, el } = await createRecipeLinkEditor();

      const cancelBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
      cancelBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });
  });
});
