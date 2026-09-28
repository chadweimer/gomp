import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { Recipe, RecipeState, UserSettings } from '../../../helpers/schema.gen';
import '../recipe-editor';

describe('recipe-editor', () => {
  const originalFetch = globalThis.fetch;
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

  function setupDefaultFetchMock(settings: UserSettings | null = mockSettings) {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/)) {
        if (settings === null) {
          return { status: 404, body: '' };
        }
        return {
          status: 200,
          body: JSON.stringify(settings),
        };
      }
      return { status: 404, body: '' };
    });
  }

  beforeEach(() => {
    fetchMocker.resetMocks();
    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);
    setupDefaultFetchMock();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    modalEl.remove();
    vi.restoreAllMocks();
  });

  describe('Suite 1: Initial Rendering & Default State', () => {
    it('builds and renders default state for a new recipe', async () => {
      const { root } = await render<HTMLRecipeEditorElement>(<recipe-editor />);
      expect(root).toHaveClass('hydrated');

      const title = root.shadowRoot?.querySelector('ion-title');
      expect(title).toEqualText('New Recipe');

      const saveBtn = root.shadowRoot?.querySelector('ion-button[color="primary"]');
      expect(saveBtn).toEqualText('Save');

      const cancelBtn = root.shadowRoot?.querySelector('ion-button[color="danger"]');
      expect(cancelBtn).toEqualText('Cancel');

      const fileInput = root.shadowRoot?.querySelector('input[type="file"]');
      expect(fileInput).not.toBeNull();
      expect(fileInput).toEqualAttribute('accept', '.jpg,.jpeg,.png');

      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput).not.toBeNull();
      expect(nameInput).toEqualAttribute('value', '');
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('autofocus');

      const servingInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Serving Size"]');
      expect(servingInput).not.toBeNull();
      expect(servingInput).toEqualAttribute('value', '');

      const timeInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Time"]');
      expect(timeInput).not.toBeNull();
      expect(timeInput).toEqualAttribute('value', '');

      const ingredientsEditor = root.shadowRoot?.querySelector('html-editor[label="Ingredients"]');
      expect(ingredientsEditor).not.toBeNull();
      expect(ingredientsEditor).toEqualAttribute('value', '');

      const directionsEditor = root.shadowRoot?.querySelector('html-editor[label="Directions"]');
      expect(directionsEditor).not.toBeNull();
      expect(directionsEditor).toEqualAttribute('value', '');

      const storageEditor = root.shadowRoot?.querySelector('html-editor[label="Storage Instructions"]');
      expect(storageEditor).not.toBeNull();
      expect(storageEditor).toEqualAttribute('value', '');

      const nutritionEditor = root.shadowRoot?.querySelector('html-editor[label="Nutrition"]');
      expect(nutritionEditor).not.toBeNull();
      expect(nutritionEditor).toEqualAttribute('value', '');

      const sourceInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Source"]');
      expect(sourceInput).not.toBeNull();
      expect(sourceInput).toEqualAttribute('value', '');

      const tagsInput = root.shadowRoot?.querySelector('tags-input[label="Tags"]');
      expect(tagsInput).not.toBeNull();
    });

    it('renders form wrapping the editor fields', async () => {
      const { root } = await render(<recipe-editor />);
      const form = root.shadowRoot?.querySelector('form');
      expect(form).not.toBeNull();
      const itemsInsideForm = form?.querySelectorAll('ion-item');
      expect(itemsInsideForm?.length).toBeGreaterThan(0);
    });
  });

  describe('Suite 2: Editing Existing Recipe', () => {
    it('renders with existing recipe values and hides picture upload', async () => {
      const { root } = await render<HTMLRecipeEditorElement>(<recipe-editor recipe={mockRecipe} />);

      const title = root.shadowRoot?.querySelector('ion-title');
      expect(title).toEqualText('Edit Recipe');

      const fileInput = root.shadowRoot?.querySelector('input[type="file"]');
      expect(fileInput).toBeNull();

      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput).toEqualAttribute('value', mockRecipe.name);

      const servingInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Serving Size"]');
      expect(servingInput).toEqualAttribute('value', mockRecipe.servingSize);

      const timeInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Time"]');
      expect(timeInput).toEqualAttribute('value', mockRecipe.time);

      const ingredientsEditor = root.shadowRoot?.querySelector('html-editor[label="Ingredients"]');
      expect(ingredientsEditor).toEqualAttribute('value', mockRecipe.ingredients);

      const directionsEditor = root.shadowRoot?.querySelector('html-editor[label="Directions"]');
      expect(directionsEditor).toEqualAttribute('value', mockRecipe.directions);

      const storageEditor = root.shadowRoot?.querySelector('html-editor[label="Storage Instructions"]');
      expect(storageEditor).toEqualAttribute('value', mockRecipe.storageInstructions);

      const nutritionEditor = root.shadowRoot?.querySelector('html-editor[label="Nutrition"]');
      expect(nutritionEditor).toEqualAttribute('value', mockRecipe.nutritionInfo);

      const sourceInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Source"]');
      expect(sourceInput).toEqualAttribute('value', mockRecipe.sourceUrl);

      const tagsInput = root.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput).not.toBeNull();
      expect(tagsInput?.value).toEqual(mockRecipe.tags);
    });

    it('passes recipe images mapped with url only to Directions html-editor', async () => {
      const { root } = await render<HTMLRecipeEditorElement>(
        <recipe-editor recipe={mockRecipe} recipeImages={['pic1.jpg', 'pic2.png']} />,
      );

      const directionsEditor = root.shadowRoot?.querySelector<HTMLHtmlEditorElement>('html-editor[label="Directions"]');
      expect(directionsEditor?.images).toEqual([
        {
          name: 'pic1.jpg',
          url: '/uploads/recipes/1/thumbs/pic1.jpg',
        },
        {
          name: 'pic2.png',
          url: '/uploads/recipes/1/thumbs/pic2.png',
        },
      ]);

      const ingredientsEditor = root.shadowRoot?.querySelector<HTMLHtmlEditorElement>('html-editor[label="Ingredients"]');
      expect(ingredientsEditor?.images).toBeUndefined();
    });
  });

  describe('Suite 3: User Settings & Suggestions', () => {
    it('populates tag suggestions from user settings', async () => {
      const { root } = await render<HTMLRecipeEditorElement>(<recipe-editor />);

      const tagsInput = root.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual(['breakfast', 'quick']);
    });

    it('falls back to empty suggestions when loadUserSettings fails', async () => {
      setupDefaultFetchMock(null);

      let lifecycleError: unknown;
      try {
        await render<HTMLRecipeEditorElement>(<recipe-editor />);
      } catch (err) {
        lifecycleError = err;
      }
      expect(lifecycleError).not.toBeDefined();

      const root = document.querySelector('recipe-editor');
      expect(root).not.toBeNull();
      expect(root).toHaveClass('hydrated');

      const tagsInput = root?.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual([]);
    });
  });

  describe('Suite 4: Form Input Updates', () => {
    it('updates recipe properties on input changes', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeEditorElement>(<recipe-editor />);

      // Name ionBlur
      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      if (nameInput) {
        nameInput.value = 'Waffles';
        nameInput.dispatchEvent(new CustomEvent('ionBlur'));
      }
      await waitForChanges();
      expect(root.recipe.name).toBe('Waffles');

      // Serving Size ionBlur
      const servingInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Serving Size"]');
      if (servingInput) {
        servingInput.value = '2 servings';
        servingInput.dispatchEvent(new CustomEvent('ionBlur'));
      }
      await waitForChanges();
      expect(root.recipe.servingSize).toBe('2 servings');

      // Time ionBlur
      const timeInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Time"]');
      if (timeInput) {
        timeInput.value = '15 mins';
        timeInput.dispatchEvent(new CustomEvent('ionBlur'));
      }
      await waitForChanges();
      expect(root.recipe.time).toBe('15 mins');

      // Source ionBlur
      const sourceInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Source"]');
      if (sourceInput) {
        sourceInput.value = 'https://example.com/waffles';
        sourceInput.dispatchEvent(new CustomEvent('ionBlur'));
      }
      await waitForChanges();
      expect(root.recipe.sourceUrl).toBe('https://example.com/waffles');

      // Ingredients valueChanged
      const ingredientsEditor = root.shadowRoot?.querySelector('html-editor[label="Ingredients"]');
      ingredientsEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Flour and butter' }));
      await waitForChanges();
      expect(root.recipe.ingredients).toBe('Flour and butter');

      // Directions valueChanged
      const directionsEditor = root.shadowRoot?.querySelector('html-editor[label="Directions"]');
      directionsEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Pour in iron' }));
      await waitForChanges();
      expect(root.recipe.directions).toBe('Pour in iron');

      // Storage Instructions valueChanged
      const storageEditor = root.shadowRoot?.querySelector('html-editor[label="Storage Instructions"]');
      storageEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Freeze' }));
      await waitForChanges();
      expect(root.recipe.storageInstructions).toBe('Freeze');

      // Nutrition valueChanged
      const nutritionEditor = root.shadowRoot?.querySelector('html-editor[label="Nutrition"]');
      nutritionEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: '450 kcal' }));
      await waitForChanges();
      expect(root.recipe.nutritionInfo).toBe('450 kcal');

      // Tags valueChanged
      const tagsInput = root.shadowRoot?.querySelector('tags-input[label="Tags"]');
      tagsInput?.dispatchEvent(new CustomEvent('valueChanged', { detail: ['breakfast', 'waffle'] }));
      await waitForChanges();
      expect(root.recipe.tags).toEqual(['breakfast', 'waffle']);
    });
  });

  describe('Suite 5: Actions (Save & Cancel)', () => {
    it('dismisses modal with undefined on cancel', async () => {
      const { root, waitForChanges } = await render(<recipe-editor />);
      modalEl.appendChild(root);

      const cancelBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
      cancelBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined);
    });

    it('dismisses modal with recipe and null file when no file selected', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeEditorElement>(<recipe-editor recipe={mockRecipe} />);
      modalEl.appendChild(root);

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith({
        recipe: mockRecipe,
        file: null,
      });
    });

    it('dismisses modal with recipe and file when image file is selected', async () => {
      const { root, waitForChanges } = await render<HTMLRecipeEditorElement>(<recipe-editor />);
      modalEl.appendChild(root);

      const fileInput = root.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
      expect(fileInput).not.toBeNull();

      const mockFile = new File(['image-content'], 'waffle.png', { type: 'image/png' });
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        configurable: true,
      });

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith({
        recipe: root.recipe,
        file: mockFile,
      });
    });

    it('does not dismiss modal when form validation fails', async () => {
      const { root, waitForChanges } = await render(<recipe-editor />);
      modalEl.appendChild(root);

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });
  });
});
