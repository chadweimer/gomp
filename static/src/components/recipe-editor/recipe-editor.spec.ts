import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController } from '@ionic/core';
import { fetchMocker } from '../../../vitest.setup';
import { Recipe, RecipeState, UserSettings } from '../../helpers/schema.gen';
import './recipe-editor';
import { RecipeEditor } from './recipe-editor';
import { HTMLEditor } from '../html-editor/html-editor';
import { TagsInput } from '../tags-input/tags-input';

describe('recipe-editor', () => {
  const originalFetch = globalThis.fetch;

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
          return Promise.resolve({ status: 404, body: '' });
        }
        return Promise.resolve(JSON.stringify(settings));
      }
      return Promise.resolve('{}');
    });
  }

  async function createRecipeEditor(template = html`<recipe-editor></recipe-editor>`) {
    const modal = await fixture<HTMLIonModalElement>(html`
      <ion-modal>
        ${template}
      </ion-modal>
    `);
    modal.dismiss = vi.fn().mockResolvedValue(true);
    const el = modal.querySelector<RecipeEditor>('recipe-editor')!;
    await new Promise(r => setTimeout(r, 10));
    await el.updateComplete;
    return { modal, el };
  }

  beforeEach(() => {
    fetchMocker.resetMocks();
    setupDefaultFetchMock();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    vi.restoreAllMocks();
  });

  describe('Suite 1: Initial Rendering & Default State', () => {
    it('builds and renders default state for a new recipe', async () => {
      const { el } = await createRecipeEditor();

      const title = el.shadowRoot?.querySelector('ion-title');
      expect(title?.textContent?.trim()).toBe('New Recipe');

      const saveBtn = el.shadowRoot?.querySelector('ion-button[color="primary"]');
      expect(saveBtn?.textContent?.trim()).toBe('Save');

      const cancelBtn = el.shadowRoot?.querySelector('ion-button[color="danger"]');
      expect(cancelBtn?.textContent?.trim()).toBe('Cancel');

      const fileInput = el.shadowRoot?.querySelector('input[type="file"]');
      expect(fileInput).not.toBeNull();
      expect(fileInput?.getAttribute('accept')).toBe('.jpg,.jpeg,.png');

      const nameInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput).not.toBeNull();
      expect(nameInput?.value).toBe('');
      expect(nameInput?.hasAttribute('required')).toBe(true);
      expect(nameInput?.hasAttribute('autofocus')).toBe(true);

      const servingInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Serving Size"]');
      expect(servingInput).not.toBeNull();
      expect(servingInput?.value).toBe('');

      const timeInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Time"]');
      expect(timeInput).not.toBeNull();
      expect(timeInput?.value).toBe('');

      const ingredientsEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="ingredients"]');
      expect(ingredientsEditor).not.toBeNull();
      expect(ingredientsEditor?.value).toBe('');

      const directionsEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="directions"]');
      expect(directionsEditor).not.toBeNull();
      expect(directionsEditor?.value).toBe('');

      const storageEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="storage-instructions"]');
      expect(storageEditor).not.toBeNull();
      expect(storageEditor?.value).toBe('');

      const nutritionEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="nutrition"]');
      expect(nutritionEditor).not.toBeNull();
      expect(nutritionEditor?.value).toBe('');

      const sourceInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Source"]');
      expect(sourceInput).not.toBeNull();
      expect(sourceInput?.value).toBe('');

      const tagsInput = el.shadowRoot?.querySelector('tags-input[label="Tags"]');
      expect(tagsInput).not.toBeNull();
    });

    it('renders form wrapping the editor fields', async () => {
      const { el } = await createRecipeEditor();

      const form = el.shadowRoot?.querySelector('form');
      expect(form).not.toBeNull();
      const itemsInsideForm = form?.querySelectorAll('ion-item');
      expect(itemsInsideForm?.length).toBeGreaterThan(0);
    });
  });

  describe('Suite 2: Editing Existing Recipe', () => {
    it('renders with existing recipe values and hides picture upload', async () => {
      const { el } = await createRecipeEditor(
        html`<recipe-editor .recipe=${mockRecipe}></recipe-editor>`
      );

      const title = el.shadowRoot?.querySelector('ion-title');
      expect(title?.textContent?.trim()).toBe('Edit Recipe');

      const fileInput = el.shadowRoot?.querySelector('input[type="file"]');
      expect(fileInput).toBeNull();

      const nameInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput?.value).toBe(mockRecipe.name);

      const servingInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Serving Size"]');
      expect(servingInput?.value).toBe(mockRecipe.servingSize);

      const timeInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Time"]');
      expect(timeInput?.value).toBe(mockRecipe.time);

      const ingredientsEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="ingredients"]');
      expect(ingredientsEditor?.value).toBe(mockRecipe.ingredients);

      const directionsEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="directions"]');
      expect(directionsEditor?.value).toBe(mockRecipe.directions);

      const storageEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="storage-instructions"]');
      expect(storageEditor?.value).toBe(mockRecipe.storageInstructions);

      const nutritionEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="nutrition"]');
      expect(nutritionEditor?.value).toBe(mockRecipe.nutritionInfo);

      const sourceInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Source"]');
      expect(sourceInput?.value).toBe(mockRecipe.sourceUrl);

      const tagsInput = el.shadowRoot?.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput).not.toBeNull();
      expect(tagsInput?.value).toEqual(mockRecipe.tags);
    });

    it('passes recipe images to Directions html-editor', async () => {
      const { el } = await createRecipeEditor(
        html`<recipe-editor .recipe=${mockRecipe} .recipeImages=${['pic1.jpg', 'pic2.png']}></recipe-editor>`
      );

      const directionsEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="directions"]');
      expect(directionsEditor?.images).toEqual([
        {
          name: 'pic1.jpg',
          url: '/uploads/recipes/1/images/pic1.jpg',
          thumbUrl: '/uploads/recipes/1/thumbs/pic1.jpg',
        },
        {
          name: 'pic2.png',
          url: '/uploads/recipes/1/images/pic2.png',
          thumbUrl: '/uploads/recipes/1/thumbs/pic2.png',
        },
      ]);

      const ingredientsEditor = el.shadowRoot?.querySelector<HTMLEditor>('html-editor[id="ingredients"]');
      expect(ingredientsEditor?.images).toBeUndefined();
    });
  });

  describe('Suite 3: User Settings & Suggestions', () => {
    it('populates tag suggestions from user settings', async () => {
      const { el } = await createRecipeEditor();

      const tagsInput = el.shadowRoot?.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual(['breakfast', 'quick']);
    });

    it('falls back to empty suggestions when loadUserSettings fails', async () => {
      setupDefaultFetchMock(null);

      const { el } = await createRecipeEditor();

      const tagsInput = el.shadowRoot?.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual([]);
    });
  });

  describe('Suite 4: Form Input Updates', () => {
    it('updates recipe properties on input changes', async () => {
      const { el } = await createRecipeEditor();

      // Name ionChange
      const nameInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      if (nameInput) {
        nameInput.value = 'Waffles';
        nameInput.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'Waffles' } }));
      }
      await el.updateComplete;
      expect(el.recipe.name).toBe('Waffles');

      // Serving Size ionChange
      const servingInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Serving Size"]');
      if (servingInput) {
        servingInput.value = '2 servings';
        servingInput.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '2 servings' } }));
      }
      await el.updateComplete;
      expect(el.recipe.servingSize).toBe('2 servings');

      // Time ionChange
      const timeInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Time"]');
      if (timeInput) {
        timeInput.value = '15 mins';
        timeInput.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '15 mins' } }));
      }
      await el.updateComplete;
      expect(el.recipe.time).toBe('15 mins');

      // Source ionChange
      const sourceInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Source"]');
      if (sourceInput) {
        sourceInput.value = 'https://example.com/waffles';
        sourceInput.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'https://example.com/waffles' } }));
      }
      await el.updateComplete;
      expect(el.recipe.sourceUrl).toBe('https://example.com/waffles');

      // Ingredients valueChanged
      const ingredientsEditor = el.shadowRoot?.querySelector('html-editor[id="ingredients"]');
      ingredientsEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Flour and butter' }));
      await el.updateComplete;
      expect(el.recipe.ingredients).toBe('Flour and butter');

      // Directions valueChanged
      const directionsEditor = el.shadowRoot?.querySelector('html-editor[id="directions"]');
      directionsEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Pour in iron' }));
      await el.updateComplete;
      expect(el.recipe.directions).toBe('Pour in iron');

      // Storage Instructions valueChanged
      const storageEditor = el.shadowRoot?.querySelector('html-editor[id="storage-instructions"]');
      storageEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: 'Freeze' }));
      await el.updateComplete;
      expect(el.recipe.storageInstructions).toBe('Freeze');

      // Nutrition valueChanged
      const nutritionEditor = el.shadowRoot?.querySelector('html-editor[id="nutrition"]');
      nutritionEditor?.dispatchEvent(new CustomEvent('valueChanged', { detail: '450 kcal' }));
      await el.updateComplete;
      expect(el.recipe.nutritionInfo).toBe('450 kcal');

      // Tags valueChanged
      const tagsInput = el.shadowRoot?.querySelector('tags-input[label="Tags"]');
      tagsInput?.dispatchEvent(new CustomEvent('valueChanged', { detail: ['breakfast', 'waffle'] }));
      await el.updateComplete;
      expect(el.recipe.tags).toEqual(['breakfast', 'waffle']);
    });
  });

  describe('Suite 5: Actions (Save & Cancel)', () => {
    it('dismisses modal with undefined on cancel', async () => {
      const { modal, el } = await createRecipeEditor();

      const cancelBtn = el.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
      cancelBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });

    it('dismisses modal with recipe and null file when no file selected', async () => {
      const { modal, el } = await createRecipeEditor(
        html`<recipe-editor .recipe=${mockRecipe}></recipe-editor>`
      );

      const saveBtn = el.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
      saveBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).toHaveBeenCalledWith(
        {
          recipe: mockRecipe,
          file: null,
        },
        'save'
      );
    });

    it('dismisses modal with recipe and file when image file is selected', async () => {
      const { modal, el } = await createRecipeEditor();

      const fileInput = el.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
      expect(fileInput).not.toBeNull();

      const mockFile = new File(['image-content'], 'waffle.png', { type: 'image/png' });
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [mockFile],
          configurable: true,
        });
      }

      // Populate name so required validation passes
      const nameInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      if (nameInput) {
        nameInput.value = 'Waffles';
        nameInput.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'Waffles' } }));
      }
      await el.updateComplete;

      const saveBtn = el.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
      saveBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).toHaveBeenCalledWith(
        {
          recipe: el.recipe,
          file: mockFile,
        },
        'save'
      );
    });

    it('does not dismiss modal when form validation fails', async () => {
      const { modal, el } = await createRecipeEditor();

      const form = el.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = el.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
      saveBtn?.click();
      await el.updateComplete;

      expect(modal.dismiss).not.toHaveBeenCalled();
    });
  });

  describe('Suite 6: Modal Dismissal Guard (canDismiss)', () => {
    async function callCanDismiss(modal: HTMLIonModalElement, data?: unknown, role?: string): Promise<boolean | undefined> {
      if (typeof modal.canDismiss === 'function') {
        return await modal.canDismiss(data, role);
      }
      return modal.canDismiss;
    }

    it('allows dismissal without confirmation when role is save', async () => {
      const { modal } = await createRecipeEditor();
      const canDismiss = await callCanDismiss(modal, undefined, 'save');
      expect(canDismiss).toBe(true);
    });

    it('allows dismissal when recipe is unmodified', async () => {
      const { modal } = await createRecipeEditor();
      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });

    it('prompts confirmation when recipe has changes', async () => {
      const { modal, el } = await createRecipeEditor(html`<recipe-editor .recipe=${mockRecipe}></recipe-editor>`);

      const nameInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      if (nameInput) {
        nameInput.value = 'Modified Pancake Name';
      }

      vi.spyOn(alertController, 'create').mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(true),
        onDidDismiss: vi.fn().mockResolvedValue({ role: 'destructive' }),
      } as any);

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });

    it('blocks dismissal when user cancels prompt', async () => {
      const { modal, el } = await createRecipeEditor(html`<recipe-editor .recipe=${mockRecipe}></recipe-editor>`);

      const nameInput = el.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      if (nameInput) {
        nameInput.value = 'Modified Pancake Name';
      }

      vi.spyOn(alertController, 'create').mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(true),
        onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
      } as any);

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(false);
    });
  });
});
