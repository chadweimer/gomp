import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, loadingController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, Note, Recipe, RecipeCompact, RecipePatch, RecipeState } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-recipe';
import { PageRecipe } from './page-recipe';
import { ReactiveElement } from 'lit';

describe('page-recipe', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;

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

  const mockNotes: Note[] = [
    { id: 10, recipeId: 1, text: 'Use fresh eggs' },
  ];

  function getBottomToolbarItem(root: ReactiveElement, text: string): HTMLIonButtonElement | undefined {
    const items = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-footer ion-buttons[slot="primary"] ion-button'));
    return items.find(item => item.textContent?.trim().includes(text));
  }

  function getFooterMenuButton(root: ReactiveElement): HTMLIonButtonElement | undefined {
    return root.renderRoot.querySelector<HTMLIonButtonElement>('#recipe-menu')
      ?? Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-footer ion-buttons[slot="primary"] ion-button')).pop();
  }

  function getPopoverMenuItems(root: ReactiveElement): HTMLIonItemElement[] {
    const popover = root.renderRoot.querySelector('ion-popover[trigger="recipe-menu"]');
    return Array.from(popover?.querySelectorAll<HTMLIonItemElement>('ion-item') ?? []);
  }

  function getPopoverMenuItem(root: ReactiveElement, text: string): HTMLIonItemElement | undefined {
    return getPopoverMenuItems(root).find(item => item.textContent?.trim().includes(text));
  }

  function mockModal(data: unknown = null): HTMLIonModalElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
      onDidDismiss: vi.fn().mockResolvedValue({ data, role: data ? 'confirm' : 'cancel' }),
    } as unknown as HTMLIonModalElement;
  }

  function mockAlert(role = 'confirm'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  function mockToast(): HTMLIonToastElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
    } as unknown as HTMLIonToastElement;
  }

  function mockLoading(): HTMLIonLoadingElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
    } as unknown as HTMLIonLoadingElement;
  }


  function defaultFetchResponse(req: Request) {
    const url = req.url;
    if (url.match(/\/recipes\/\d+$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify(mockRecipe) };
    }
    if (url.match(/\/recipes\/\d+\/links$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify(mockLinks) };
    }
    if (url.match(/\/recipes\/\d+\/images$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify(mockImages) };
    }
    if (url.match(/\/recipes\/\d+\/notes$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify(mockNotes) };
    }
    if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify({ total: 1, recipes: [mockRecipe] }) };
    }
    return { status: 200, body: JSON.stringify({}) };
  }

  function setupDefaultFetchMock(customRecipe: Recipe = mockRecipe) {
    fetchMocker.mockResponse((req: Request) => {
      const url = req.url;
      if (url.match(/\/recipes\/\d+$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(customRecipe) };
      }
      if (url.match(/\/recipes\/\d+\/links$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockLinks) };
      }
      if (url.match(/\/recipes\/\d+\/images$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockImages) };
      }
      if (url.match(/\/recipes\/\d+\/notes$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockNotes) };
      }
      if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify({ total: 1, recipes: [customRecipe] }) };
      }
      return { status: 200, body: JSON.stringify({}) };
    });
  }

  async function createRecipePage(recipeId = 1): Promise<PageRecipe> {
    const root = await fixture<PageRecipe>(html`<page-recipe .recipeId=${recipeId}></page-recipe>`);
    await new Promise((r) => setTimeout(r, 10));
    await root.updateComplete;
    return root;
  }

  beforeEach(() => {
    localStorage?.clear();
    sessionStorage?.clear();
    fetchMocker.resetMocks();
    clearState();

    routerEl = document.createElement('ion-router');
    routerEl.push = vi.fn().mockResolvedValue(true);
    document.body.appendChild(routerEl);

    setupDefaultFetchMock();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    routerEl.remove();
    vi.restoreAllMocks();
  });

  describe('Suite 1: Initial Loading & Component Lifecycle', () => {
    it('builds and hydrates the component', async () => {
      const root = await createRecipePage(1);
      await root.updateComplete;
      expect(root.tagName.toLowerCase()).toBe('page-recipe');
    });

    it('binds data to child components and templates', async () => {
      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipePrint = root.renderRoot.querySelector('recipe-print');
      expect(recipePrint).not.toBeNull();
      expect(recipePrint?.recipe).toEqual(mockRecipe);

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      expect(recipeViewer).not.toBeNull();
      expect(recipeViewer?.recipe).toEqual(mockRecipe);
      expect(recipeViewer?.links).toEqual(mockLinks);

      const pictureCards = root.renderRoot.querySelectorAll('ion-card.image');
      expect(pictureCards).toHaveLength(mockImages.length);

      const firstThumb = pictureCards[0].querySelector('img');
      expect(firstThumb?.getAttribute('src')).toBe('/uploads/recipes/1/thumbs/pancakes.jpg');

      const noteCards = root.renderRoot.querySelectorAll('note-card');
      expect(noteCards).toHaveLength(mockNotes.length);
      expect(noteCards[0].note).toEqual(mockNotes[0]);
    });

    it('handles API errors during initial load gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      fetchMocker.mockResponse(() => ({
        status: 500,
        body: 'Internal Server Error',
      }));

      const root = await createRecipePage(1);
      await root.updateComplete;

      expect(root).not.toBeNull();
      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      expect(recipeViewer?.recipe).toBeFalsy();
      expect(recipeViewer?.links?.length ?? 0).toBe(0);

      const pictureCards = root.renderRoot.querySelectorAll('ion-card.image');
      expect(pictureCards).toHaveLength(0);

      const noteCards = root.renderRoot.querySelectorAll('note-card');
      expect(noteCards).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('reloads recipe, links, images, and notes on activatedCallback', async () => {
      const root = await createRecipePage(1);
      await root.updateComplete;

      let requests = fetchMocker.requests();
      const initialGetCount = requests.filter((r) => r.method === 'GET').length;
      expect(initialGetCount).toBeGreaterThanOrEqual(4);

      await root.activatedCallback();
      await root.updateComplete;

      requests = fetchMocker.requests();
      const totalGetCount = requests.filter((r) => r.method === 'GET').length;
      expect(totalGetCount).toBeGreaterThanOrEqual(initialGetCount + 4);
    });
  });

  describe('Suite 2: Access Control & Authorization (RBAC)', () => {
    it('renders read-only view and hides editor controls for unauthenticated or viewer users', async () => {
      state.currentUser = { id: 99, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      expect(recipeViewer?.hasAttribute('readonly') || recipeViewer?.readonly === true).toBe(true);

      const noteCards = root.renderRoot.querySelectorAll('note-card');
      noteCards.forEach((card) => {
        expect(card.hasAttribute('readonly') || card.readonly === true).toBe(true);
      });

      expect(getBottomToolbarItem(root, 'Edit')).toBeUndefined();
      expect(getBottomToolbarItem(root, 'Add Note')).toBeUndefined();
      expect(getBottomToolbarItem(root, 'Upload Picture')).toBeUndefined();
      expect(getBottomToolbarItem(root, 'Add Link')).toBeUndefined();
      expect(getBottomToolbarItem(root, 'Archive')).toBeUndefined();
      expect(getBottomToolbarItem(root, 'Delete')).toBeUndefined();
      expect(getBottomToolbarItem(root, 'Print')).toBeDefined();

      const footerButtons = Array.from(root.renderRoot.querySelectorAll('ion-footer ion-button'));
      const footerTexts = footerButtons.map((b) => b.textContent?.trim());
      expect(footerTexts).not.toContain('Edit');
      expect(footerTexts).not.toContain('Add Note');

      const pictureButtons = root.renderRoot.querySelectorAll('ion-card.image ion-button');
      expect(pictureButtons).toHaveLength(0);
    });

    it('renders edit controls for editor or admin users', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      expect(recipeViewer?.hasAttribute('readonly') ?? false).toBe(false);

      const noteCards = root.renderRoot.querySelectorAll('note-card');
      noteCards.forEach((card) => {
        expect(card.hasAttribute('readonly') ?? false).toBe(false);
      });

      expect(getBottomToolbarItem(root, 'Edit')).toBeDefined();
      expect(getBottomToolbarItem(root, 'Add Note')).toBeDefined();
      expect(getBottomToolbarItem(root, 'Upload Picture')).toBeDefined();
      expect(getBottomToolbarItem(root, 'Add Link')).toBeDefined();
      expect(getBottomToolbarItem(root, 'Archive')).toBeDefined();
      expect(getBottomToolbarItem(root, 'Delete')).toBeDefined();
      expect(getBottomToolbarItem(root, 'Print')).toBeDefined();

      const pictureButtons = root.renderRoot.querySelectorAll('ion-card.image ion-button');
      expect(pictureButtons.length).toBeGreaterThan(0);
    });

    it('shows Archive button when recipe is active, and Unarchive when archived', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };

      const activeRoot = await createRecipePage(1);
      expect(getBottomToolbarItem(activeRoot, 'Archive')).toBeDefined();
      expect(getBottomToolbarItem(activeRoot, 'Unarchive')).toBeUndefined();

      const archivedRecipe: Recipe = {
        ...mockRecipe,
        state: RecipeState.Archived,
      };
      setupDefaultFetchMock(archivedRecipe);

      const archivedRoot = await createRecipePage(1);
      await archivedRoot.updateComplete;
      expect(getBottomToolbarItem(archivedRoot, 'Unarchive')).toBeDefined();
      expect(getBottomToolbarItem(archivedRoot, 'Archive')).toBeUndefined();
    });
  });

  describe('Suite 3: Recipe Operations', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
    });

    it('edits recipe via modal and saves updated recipe', async () => {
      const modal = mockModal({ recipe: { name: 'Super Pancakes' } });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PUT') {
          return { status: 200, body: JSON.stringify({ ...mockRecipe, name: 'Super Pancakes' }) };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const editBtn = getBottomToolbarItem(root, 'Edit');
      expect(editBtn).toBeDefined();
      editBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('recipe-editor');
      const props = modalOptions.componentProps as { recipe?: Recipe } | undefined;
      expect(props?.recipe?.id).toBe(1);

      const putRequest = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'PUT');
      expect(putRequest).toBeDefined();
      const body = (await putRequest?.clone().json()) as Recipe;
      expect(body.name).toBe('Super Pancakes');
    });

    it('cancels edit when modal is dismissed without data', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Edit')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const putRequest = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'PUT');
      expect(putRequest).toBeUndefined();
    });

    it('shows toast error when saving recipe fails', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ recipe: { name: 'Super Pancakes' } }));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PUT') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Edit')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save recipe.' })
      );
    });

    it('deletes recipe upon confirmation and redirects to /recipes', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Delete')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Recipe?' })
      );

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });

    it('cancels recipe deletion when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Delete')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('shows toast error when deleting recipe fails', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Delete')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete recipe.' })
      );
    });

    it('archives recipe upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PATCH') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Archive')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Archive Recipe?' })
      );

      const patchReq = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
      expect(patchReq).toBeDefined();
      const body = (await patchReq?.clone().json()) as RecipePatch;
      expect(body).toEqual({ state: RecipeState.Archived });
    });

    it('unarchives recipe upon confirmation', async () => {
      const archivedRecipe: Recipe = {
        ...mockRecipe,
        state: RecipeState.Archived,
      };

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PATCH') {
          return { status: 200, body: '' };
        }
        if (req.url.match(/\/recipes\/\d+$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(archivedRecipe) };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const unarchiveBtn = getBottomToolbarItem(root, 'Unarchive');
      expect(unarchiveBtn).toBeDefined();
      unarchiveBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Unarchive Recipe?' })
      );

      const patchReq = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
      expect(patchReq).toBeDefined();
      const body = (await patchReq?.clone().json()) as RecipePatch;
      expect(body).toEqual({ state: RecipeState.Active });
    });

    it('shows toast error when archiving fails', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PATCH') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Archive')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save recipe state.' })
      );
    });

    it('updates rating when ratingSelected event is fired', async () => {
      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PATCH') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('ratingSelected', { detail: 5, bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const patchReq = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
      expect(patchReq).toBeDefined();
      const body = (await patchReq?.clone().json()) as RecipePatch;
      expect(body).toEqual({ rating: 5 });
    });

    it('shows toast error when rating update fails', async () => {
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PATCH') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('ratingSelected', { detail: 5, bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save recipe rating.' })
      );
    });

    it('updates searchFilter tags and redirects to /recipes when tagClicked is fired', async () => {
      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('tagClicked', { detail: 'breakfast', bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(state.searchFilter.tags).toEqual(['breakfast']);
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });

    it('triggers window.print when print button is clicked', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => { });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Print')?.click();
      await root.updateComplete;

      expect(printSpy).toHaveBeenCalled();
    });
  });

  describe('Suite 4: Recipe Link Operations', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
    });

    it('adds a link via modal', async () => {
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ recipeId: 99 }));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/links\/99$/) && req.method === 'PUT') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Add Link')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('recipe-link-editor');
      const props = modalOptions.componentProps as { parentRecipeId?: number } | undefined;
      expect(props?.parentRecipeId).toBe(1);

      const putReq = requests.find((r) => r.url.match(/\/recipes\/1\/links\/99$/) && r.method === 'PUT');
      expect(putReq).toBeDefined();
    });

    it('cancels add link when modal is dismissed without data', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Add Link')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const putReq = requests.find((r) => r.url.match(/\/recipes\/1\/links/) && r.method === 'PUT');
      expect(putReq).toBeUndefined();
    });

    it('shows toast error when adding link fails', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ recipeId: 99 }));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/links\/99$/) && req.method === 'PUT') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Add Link')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to add linked recipe.' })
      );
    });

    it('deletes link upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/links\/2$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('deleteLinkClicked', { detail: mockLinks[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createAlertSpy).toHaveBeenCalled();
      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('Remove Link?');
      expect(alertOptions.message as string).toContain('Waffles');

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1\/links\/2$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('cancels delete link when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('deleteLinkClicked', { detail: mockLinks[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1\/links\/2$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
    });

    it('shows toast error when deleting link fails or link id is null', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/links\/2$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const recipeViewer = root.renderRoot.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('deleteLinkClicked', { detail: mockLinks[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete linked recipe.' })
      );
    });
  });

  describe('Suite 5: Recipe Note Operations', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
    });

    it('adds a new note via modal', async () => {
      const newNote: Note = { text: 'New Note' };
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ note: newNote }));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/notes$/) && req.method === 'POST') {
          return { status: 200, body: JSON.stringify({ ...newNote, id: 11 }) };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Add Note')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('note-editor');

      const postReq = requests.find((r) => r.url.match(/\/recipes\/1\/notes$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
      const body = (await postReq?.clone().json()) as Note;
      expect(body.text).toBe('New Note');
    });

    it('cancels add note when modal is dismissed without data', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Add Note')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const postReq = requests.find((r) => r.url.match(/\/recipes\/1\/notes$/) && r.method === 'POST');
      expect(postReq).toBeUndefined();
    });

    it('shows toast error when adding note fails', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ note: { text: 'Failing note' } }));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/notes$/) && req.method === 'POST') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Add Note')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save note.' })
      );
    });

    it('edits an existing note via modal', async () => {
      const updatedNote: Note = { ...mockNotes[0], text: 'Updated text' };
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ note: updatedNote }));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/notes\/10$/) && req.method === 'PUT') {
          return { status: 200, body: JSON.stringify(updatedNote) };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const noteCard = root.renderRoot.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('editClicked', { detail: mockNotes[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('note-editor');
      const props = modalOptions.componentProps as { note?: Note } | undefined;
      expect(props?.note?.id).toBe(10);

      const putReq = requests.find((r) => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'PUT');
      expect(putReq).toBeDefined();
      const body = (await putReq?.clone().json()) as Note;
      expect(body.text).toBe('Updated text');
    });

    it('cancels edit note when modal is dismissed without data', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const noteCard = root.renderRoot.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('editClicked', { detail: mockNotes[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const putReq = requests.find((r) => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'PUT');
      expect(putReq).toBeUndefined();
    });

    it('shows toast error when saving note fails or note has null id', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ note: { ...mockNotes[0], text: 'Updated' } }));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/notes\/10$/) && req.method === 'PUT') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const noteCard = root.renderRoot.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('editClicked', { detail: mockNotes[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save note.' })
      );
    });

    it('deletes note upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/notes\/10$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const noteCard = root.renderRoot.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('deleteClicked', { detail: mockNotes[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Note?' })
      );

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('cancels delete note when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const noteCard = root.renderRoot.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('deleteClicked', { detail: mockNotes[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
    });

    it('shows toast error when deleting note fails or note has null id', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/notes\/10$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const noteCard = root.renderRoot.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('deleteClicked', { detail: mockNotes[0], bubbles: true }));
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete note.' })
      );
    });
  });

  describe('Suite 6: Recipe Picture Operations', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
    });

    it('uploads a picture via file-upload-browser modal', async () => {
      const mockFile = new File(['fake-image-bytes'], 'test.png', { type: 'image/png' });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ file: mockFile }));
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(mockLoading());

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/images$/) && req.method === 'POST') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Upload Picture')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('file-upload-browser');

      expect(createLoadingSpy).toHaveBeenCalled();
      const postReq = requests.find((r) => r.url.match(/\/recipes\/1\/images$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
    });

    it('cancels upload picture when modal is dismissed without file', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Upload Picture')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const postReq = requests.find((r) => r.url.match(/\/recipes\/1\/images$/) && r.method === 'POST');
      expect(postReq).toBeUndefined();
    });

    it('shows toast error when upload picture fails', async () => {
      const mockFile = new File(['fake-image-bytes'], 'test.png', { type: 'image/png' });
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({ file: mockFile }));
      vi.spyOn(loadingController, 'create').mockResolvedValue(mockLoading());
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/images$/) && req.method === 'POST') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      getBottomToolbarItem(root, 'Upload Picture')?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to upload picture.' })
      );
    });

    it('sets main image upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PATCH') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const starBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-card.image ion-button:not([color="danger"])');
      expect(starBtn).toBeDefined();
      starBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Set Main Picture?' })
      );

      const patchReq = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
      expect(patchReq).toBeDefined();
      const body = (await patchReq?.clone().json()) as RecipePatch;
      expect(body.mainImageName).toBe('pancakes.jpg');
    });

    it('cancels set main image when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const setAsMainBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-card.image ion-button:not([color="danger"])');
      setAsMainBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const patchReq = requests.find((r) => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
      expect(patchReq).toBeUndefined();
    });

    it('shows toast error when setting main image fails', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1$/) && req.method === 'PATCH') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const setAsMainBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-card.image ion-button:not([color="danger"])');
      setAsMainBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save main image for recipe.' })
      );
    });

    it('deletes image upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const deleteImgBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-card.image ion-button[color="danger"]');
      expect(deleteImgBtn).toBeDefined();
      deleteImgBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Picture?' })
      );

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('cancels delete image when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const deleteImgBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-card.image ion-button[color="danger"]');
      deleteImgBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      const deleteReq = requests.find((r) => r.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
    });

    it('shows toast error when delete image fails', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const root = await createRecipePage(1);
      await root.updateComplete;

      const deleteImgBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-card.image ion-button[color="danger"]');
      deleteImgBtn?.click();
      await root.updateComplete;
      await new Promise((r) => setTimeout(r, 10));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete picture.' })
      );
    });
  });

  describe('Suite 7: Mobile Popover Menu Operations', () => {
    it('renders popover menu with only Print and Cancel for Viewer users', async () => {
      state.currentUser = { id: 99, username: 'viewer', accessLevel: AccessLevel.Viewer };

      const root = await createRecipePage(1);

      expect(getFooterMenuButton(root)).not.toBeNull();
      const items = getPopoverMenuItems(root);
      const buttonTexts = items.map((b) => b.textContent?.trim());
      expect(buttonTexts).toContain('Print');
      expect(buttonTexts).not.toContain('Edit');
      expect(buttonTexts).not.toContain('Add Note');
      expect(buttonTexts).not.toContain('Upload Picture');
      expect(buttonTexts).not.toContain('Add Link');
      expect(buttonTexts).not.toContain('Delete');
      expect(buttonTexts).not.toContain('Archive');
    });

    it('renders popover menu with all editor options for active recipes', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };

      const root = await createRecipePage(1);

      expect(getFooterMenuButton(root)).not.toBeNull();
      const items = getPopoverMenuItems(root);
      const buttonTexts = items.map((b) => b.textContent?.trim());
      expect(buttonTexts).toContain('Delete');
      expect(buttonTexts).toContain('Archive');
      expect(buttonTexts).toContain('Add Link');
      expect(buttonTexts).toContain('Upload Picture');
      expect(buttonTexts).toContain('Add Note');
      expect(buttonTexts).toContain('Edit');
      expect(buttonTexts).toContain('Print');
    });

    it('renders popover menu with Unarchive for archived recipes', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const archivedRecipe: Recipe = { ...mockRecipe, state: RecipeState.Archived };
      setupDefaultFetchMock(archivedRecipe);

      const root = await createRecipePage(1);

      expect(getFooterMenuButton(root)).not.toBeNull();
      const items = getPopoverMenuItems(root);
      const buttonTexts = items.map((b) => b.textContent?.trim());
      expect(buttonTexts).toContain('Unarchive');
      expect(buttonTexts).not.toContain('Archive');
    });

    it('handles clicking each popover menu item', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };

      const actions = ['Print', 'Delete', 'Archive', 'Add Link', 'Upload Picture', 'Add Note', 'Edit'] as const;

      for (const action of actions) {
        const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));
        const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));
        const printSpy = vi.spyOn(window, 'print').mockImplementation(() => { });

        const root = await createRecipePage(1);

        const menuItem = getPopoverMenuItem(root, action);
        expect(menuItem).not.toBeUndefined();
        menuItem?.click();
        await root.updateComplete;

        switch (action) {
          case 'Print':
            expect(printSpy).toHaveBeenCalled();
            break;
          case 'Delete':
            expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Delete Recipe?' }));
            break;
          case 'Archive':
            expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Archive Recipe?' }));
            break;
          case 'Add Link':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'recipe-link-editor' }));
            break;
          case 'Upload Picture':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'file-upload-browser' }));
            break;
          case 'Add Note':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'note-editor' }));
            break;
          case 'Edit':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'recipe-editor' }));
            break;
        }

        vi.restoreAllMocks();
        setupDefaultFetchMock();
      }
    });

    it('handles unarchive click for archived recipe', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const archivedRecipe: Recipe = { ...mockRecipe, state: RecipeState.Archived };
      setupDefaultFetchMock(archivedRecipe);

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const root = await createRecipePage(1);

      const unarchiveItem = getPopoverMenuItem(root, 'Unarchive');
      expect(unarchiveItem).not.toBeUndefined();
      unarchiveItem?.click();
      await root.updateComplete;

      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Unarchive Recipe?' }));
    });
  });
});
