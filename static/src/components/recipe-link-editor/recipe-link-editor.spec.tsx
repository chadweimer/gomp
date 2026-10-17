import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { fetchMocker } from '../../../vitest.setup';
import { RecipeCompact, RecipeState, SearchResult } from '../../helpers/schema.gen';
import { clearState } from '../../stores/state';
import './recipe-link-editor';

describe('recipe-link-editor', () => {
  const originalFetch = globalThis.fetch;
  let modalEl: HTMLIonModalElement;

  const mockRecipes: RecipeCompact[] = [
    {
      id: 1,
      name: 'Spaghetti Carbonara',
      state: RecipeState.Active,
      rating: 5,
      mainImageName: 'carbonara.jpg',
    },
    {
      id: 2,
      name: 'Parent Recipe',
      state: RecipeState.Active,
      rating: 4,
      mainImageName: '',
    },
    {
      id: 3,
      name: 'Chicken Alfredo',
      state: RecipeState.Active,
      rating: 4.5,
      mainImageName: '',
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
        return {
          status: 200,
          body: JSON.stringify({
            total: mockRecipes.length,
            recipes: mockRecipes,
          } as SearchResult),
        };
      }
      return { status: 404, body: '' };
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    modalEl.remove();
    vi.restoreAllMocks();
  });

  it('builds and renders default state', async () => {
    const { root } = await render(<recipe-link-editor />);
    expect(root).toHaveClass('hydrated');

    const title = root.shadowRoot?.querySelector('ion-title');
    expect(title).toHaveTextContent('Add Link');

    const input = root.shadowRoot?.querySelector('ion-input[type="search"]');
    expect(input).not.toBeNull();
    expect(input).toEqualAttribute('value', '');

    const toggleBtn = root.shadowRoot?.querySelector('ion-list-header ion-button');
    expect(toggleBtn).toHaveTextContent('Include Archived');
  });

  describe('search query input', () => {
    it('does not search and clears results when query has fewer than 2 characters', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeLinkEditorElement>(<recipe-link-editor />);
      const searchInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type="search"]');

      if (searchInput) {
        searchInput.value = 'a';
        searchInput.dispatchEvent(new CustomEvent('ionInput'));
      }
      await waitForChanges();

      const requests = fetchMocker.requests() as Request[];
      const searchReq = requests.find(r => r.url.match(/\/recipes(\?.*)?$/));
      expect(searchReq).toBeUndefined();

      const items = root.shadowRoot?.querySelectorAll('ion-radio-group ion-item');
      expect(items).toHaveLength(0);
    });

    it('searches recipes and filters out parent recipe when query has 2 or more characters', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeLinkEditorElement>(
        <recipe-link-editor parentRecipeId={2} />
      );
      const searchInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type="search"]');

      if (searchInput) {
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput'));
      }
      await waitForChanges();

      const requests = fetchMocker.requests() as Request[];
      const searchReq = requests.find(r => r.url.match(/\/recipes(\?.*)?$/));
      expect(searchReq).toBeDefined();
      expect(searchReq?.url).toContain('q=pasta');

      // Parent recipe (id: 2) should be excluded, leaving 2 recipes
      const items = root.shadowRoot?.querySelectorAll('ion-radio-group ion-item');
      expect(items).toHaveLength(2);

      // Verify recipe names
      const radios = root.shadowRoot?.querySelectorAll('ion-radio');
      expect(radios?.[0]).toHaveTextContent('Spaghetti Carbonara');
      expect(radios?.[1]).toHaveTextContent('Chicken Alfredo');

      // Verify thumbnail for recipe with mainImageName
      const img = items?.[0]?.querySelector('img');
      expect(img).not.toBeNull();
      expect(img).toEqualAttribute('src', '/uploads/recipes/1/thumbs/carbonara.jpg');
    });
  });

  describe('archived filter toggle', () => {
    it('toggles includeArchived and triggers search with archived state', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeLinkEditorElement>(<recipe-link-editor />);
      const searchInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput'));
      }
      await waitForChanges();

      const toggleBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-list-header ion-button');
      expect(toggleBtn).toHaveTextContent('Include Archived');

      toggleBtn?.click();
      await waitForChanges();

      expect(toggleBtn).toHaveTextContent('Exclude Archived');

      const requests = fetchMocker.requests() as Request[];
      const archivedReq = requests.find(r => r.url.includes(RecipeState.Archived));
      expect(archivedReq).toBeDefined();

      // Toggle back to exclude
      toggleBtn?.click();
      await waitForChanges();

      expect(toggleBtn).toHaveTextContent('Include Archived');
    });
  });

  describe('recipe selection', () => {
    it('updates selected recipe on radio group ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeLinkEditorElement>(<recipe-link-editor />);
      const searchInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput'));
      }
      await waitForChanges();

      const radioGroup = root.shadowRoot?.querySelector('ion-radio-group');
      radioGroup?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 1 } }));
      await waitForChanges();

      expect(radioGroup).toEqualAttribute('value', '1');
    });
  });

  describe('save and cancel actions', () => {
    it('shows validation error when saving without selecting a recipe', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeLinkEditorElement>(<recipe-link-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const searchInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
      }

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await waitForChanges();

      expect(setCustomValiditySpy).toHaveBeenCalledWith('A recipe must be selected');
      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });

    it('dismisses modal with selected recipeId when valid', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeLinkEditorElement>(<recipe-link-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const searchInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type="search"]');
      if (searchInput) {
        searchInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
        searchInput.value = 'pasta';
        searchInput.dispatchEvent(new CustomEvent('ionInput'));
      }
      await waitForChanges();

      const radioGroup = root.shadowRoot?.querySelector('ion-radio-group');
      radioGroup?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 3 } }));
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(true);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await waitForChanges();

      expect(setCustomValiditySpy).toHaveBeenCalledWith('');
      expect(modalEl.dismiss).toHaveBeenCalledWith({ recipeId: 3 }, 'save');
    });

    it('dismisses modal with cancel role when Cancel is clicked', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeLinkEditorElement>(<recipe-link-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const cancelBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
      cancelBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });
  });
});
