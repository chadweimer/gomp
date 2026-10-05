import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { actionSheetController, alertController, loadingController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, Note, Recipe, RecipeCompact, RecipePatch, RecipeState } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-recipe';

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
    { id: 2, name: 'Waffles', state: RecipeState.Active, mainImageName: 'waffles.jpg', rating: 4 },
  ];

  const mockImages: string[] = ['pancakes.jpg', 'extra.jpg'];

  const mockNotes: Note[] = [
    { id: 10, recipeId: 1, text: 'Use fresh eggs' },
  ];

  function getSideMenuItem(root: HTMLElement, text: string): HTMLIonItemElement | undefined {
    const items = Array.from(root.querySelectorAll<HTMLIonItemElement>('.side-menu ion-item'));
    return items.find(item => item.textContent?.trim().includes(text));
  }

  function getFooterMenuButton(root: HTMLElement): HTMLIonButtonElement | undefined {
    const buttons = Array.from(root.querySelectorAll<HTMLIonButtonElement>('ion-footer ion-buttons[slot="primary"] ion-button'));
    return buttons.find(b => b.querySelector('ion-icon[slot="icon-only"]') !== null) ?? buttons[buttons.length - 1];
  }

  function mockModal(data: unknown = null): HTMLIonModalElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data }),
    } as unknown as HTMLIonModalElement;
  }

  function mockAlert(role = 'confirm'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  function mockToast(): HTMLIonToastElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLIonToastElement;
  }

  function mockLoading(): HTMLIonLoadingElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
    } as unknown as HTMLIonLoadingElement;
  }

  function mockActionSheet(role = 'cancel'): HTMLIonActionSheetElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonActionSheetElement;
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
        return {
          status: 200,
          body: JSON.stringify(customRecipe),
        };
      }
      if (url.match(/\/recipes\/\d+\/links$/) && req.method === 'GET') {
        return {
          status: 200,
          body: JSON.stringify(mockLinks),
        };
      }
      if (url.match(/\/recipes\/\d+\/images$/) && req.method === 'GET') {
        return {
          status: 200,
          body: JSON.stringify(mockImages),
        };
      }
      if (url.match(/\/recipes\/\d+\/notes$/) && req.method === 'GET') {
        return {
          status: 200,
          body: JSON.stringify(mockNotes),
        };
      }
      if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
        return {
          status: 200,
          body: JSON.stringify({ total: 1, recipes: [customRecipe] }),
        };
      }
      return {
        status: 200,
        body: JSON.stringify({}),
      };
    });
  }

  beforeEach(() => {
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
      const { root } = await render(<page-recipe recipeId={1} />);
      expect(root).toHaveClass('hydrated');
    });

    it('binds data to child components and templates', async () => {
      const { root } = await render(<page-recipe recipeId={1} />);

      const recipePrint = root.querySelector<HTMLRecipePrintElement>('recipe-print');
      expect(recipePrint).not.toBeNull();
      expect(recipePrint?.recipe).toEqual(mockRecipe);

      const recipeViewer = root.querySelector<HTMLRecipeViewerElement>('recipe-viewer');
      expect(recipeViewer).not.toBeNull();
      expect(recipeViewer?.recipe).toEqual(mockRecipe);
      expect(recipeViewer?.links).toEqual(mockLinks);

      const pictureCards = root.querySelectorAll('ion-card.zoom');
      expect(pictureCards).toHaveLength(mockImages.length);

      const firstThumb = pictureCards[0].querySelector('img');
      expect(firstThumb).toEqualAttribute('src', '/uploads/recipes/1/thumbs/pancakes.jpg');

      const noteCards = root.querySelectorAll<HTMLNoteCardElement>('note-card');
      expect(noteCards).toHaveLength(mockNotes.length);
      expect(noteCards[0].note).toEqual(mockNotes[0]);
    });

    it('handles API errors during initial load gracefully', async () => {
      fetchMocker.mockResponse(() => ({
        status: 500,
        body: 'Internal Server Error',
      }));

      // @stencil/vitest re-throws any Error logged via console.error during component lifecycle
      let lifecycleError: unknown;
      try {
        await render(<page-recipe recipeId={1} />);
      } catch (err) {
        lifecycleError = err;
      }
      expect(lifecycleError).toBeDefined();

      const root = document.querySelector('page-recipe');
      expect(root).not.toBeNull();
      expect(root).toHaveClass('hydrated');

      const recipeViewer = root?.querySelector<HTMLRecipeViewerElement>('recipe-viewer');
      expect(recipeViewer?.recipe).toBeFalsy();
      expect(recipeViewer?.links?.length ?? 0).toBe(0);

      const pictureCards = root?.querySelectorAll('ion-card.zoom');
      expect(pictureCards).toHaveLength(0);

      const noteCards = root?.querySelectorAll<HTMLNoteCardElement>('note-card');
      expect(noteCards).toHaveLength(0);
    });

    it('reloads recipe, links, images, and notes on activatedCallback', async () => {
      const { root } = await render<HTMLPageRecipeElement>(<page-recipe recipeId={1} />);

      let requests = fetchMocker.requests() as Request[];
      const initialGetCount = requests.filter((r: Request) => r.method === 'GET').length;
      expect(initialGetCount).toBeGreaterThanOrEqual(4);

      await root.activatedCallback();

      requests = fetchMocker.requests() as Request[];
      const totalGetCount = requests.filter((r: Request) => r.method === 'GET').length;
      expect(totalGetCount).toBeGreaterThanOrEqual(initialGetCount + 4);
    });
  });

  describe('Suite 2: Access Control & Authorization (RBAC)', () => {
    it('renders read-only view and hides editor controls for unauthenticated or viewer users', async () => {
      state.currentUser = { id: 99, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const { root } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector<HTMLRecipeViewerElement>('recipe-viewer');
      expect(recipeViewer?.hasAttribute('readonly') || recipeViewer?.readonly === true).toBe(true);

      const noteCards = root.querySelectorAll<HTMLNoteCardElement>('note-card');
      noteCards.forEach(card => {
        expect(card.hasAttribute('readonly') || card.readonly === true).toBe(true);
      });

      expect(getSideMenuItem(root, 'Edit')).toBeUndefined();
      expect(getSideMenuItem(root, 'Add Note')).toBeUndefined();
      expect(getSideMenuItem(root, 'Upload Picture')).toBeUndefined();
      expect(getSideMenuItem(root, 'Add Link')).toBeUndefined();
      expect(getSideMenuItem(root, 'Archive')).toBeUndefined();
      expect(getSideMenuItem(root, 'Delete')).toBeUndefined();
      expect(getSideMenuItem(root, 'Print')).toBeDefined();

      const footerButtons = Array.from(root.querySelectorAll('ion-footer ion-button'));
      const footerTexts = footerButtons.map(b => b.textContent?.trim());
      expect(footerTexts).not.toContain('Edit');
      expect(footerTexts).not.toContain('Add Note');

      const pictureButtons = root.querySelectorAll('ion-card.zoom ion-button');
      expect(pictureButtons).toHaveLength(0);
    });

    it('renders edit controls for editor or admin users', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const { root } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector<HTMLRecipeViewerElement>('recipe-viewer');
      expect(recipeViewer?.hasAttribute('readonly')).toBe(false);

      const noteCards = root.querySelectorAll<HTMLNoteCardElement>('note-card');
      noteCards.forEach(card => {
        expect(card.hasAttribute('readonly')).toBe(false);
      });

      expect(getSideMenuItem(root, 'Edit')).toBeDefined();
      expect(getSideMenuItem(root, 'Add Note')).toBeDefined();
      expect(getSideMenuItem(root, 'Upload Picture')).toBeDefined();
      expect(getSideMenuItem(root, 'Add Link')).toBeDefined();
      expect(getSideMenuItem(root, 'Archive')).toBeDefined();
      expect(getSideMenuItem(root, 'Delete')).toBeDefined();
      expect(getSideMenuItem(root, 'Print')).toBeDefined();

      const pictureButtons = root.querySelectorAll('ion-card.zoom ion-button');
      expect(pictureButtons.length).toBeGreaterThan(0);
    });

    it('shows Archive button when recipe is active, and Unarchive when archived', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };

      const { root: activeRoot } = await render(<page-recipe recipeId={1} />);
      expect(getSideMenuItem(activeRoot, 'Archive')).toBeDefined();
      expect(getSideMenuItem(activeRoot, 'Unarchive')).toBeUndefined();

      const archivedRecipe: Recipe = {
        ...mockRecipe,
        state: RecipeState.Archived,
      };
      setupDefaultFetchMock(archivedRecipe);

      const { root: archivedRoot } = await render(<page-recipe recipeId={1} />);
      expect(getSideMenuItem(archivedRoot, 'Unarchive')).toBeDefined();
      expect(getSideMenuItem(archivedRoot, 'Archive')).toBeUndefined();
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const editBtn = getSideMenuItem(root, 'Edit');
      expect(editBtn).toBeDefined();
      editBtn?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('recipe-editor');
      const props = modalOptions.componentProps as { recipe?: Recipe } | undefined;
      expect(props?.recipe?.id).toBe(1);

      const putRequest = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PUT');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Edit')?.click();
      await waitForChanges();

      const putRequest = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PUT');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Edit')?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save recipe.' })
      );
    });

    it('deletes recipe upon confirmation and redirects to /recipes', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Delete')?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Recipe?' })
      );

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'DELETE');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Delete')?.click();
      await waitForChanges();

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('shows toast error when deleting recipe fails', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Delete')?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Archive')?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Arhive Recipe?' })
      );

      const patchReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const unarchiveBtn = getSideMenuItem(root, 'Unarchive');
      expect(unarchiveBtn).toBeDefined();
      unarchiveBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Unarchive Recipe?' })
      );

      const patchReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Archive')?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('ratingSelected', { detail: 5 }));
      await waitForChanges();

      const patchReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('ratingSelected', { detail: 5 }));
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save recipe rating.' })
      );
    });

    it('updates searchFilter tags and redirects to /recipes when tagClicked is fired', async () => {
      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('tagClicked', { detail: 'breakfast' }));
      await waitForChanges();

      expect(state.searchFilter.tags).toEqual(['breakfast']);
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });

    it('triggers window.print when print button is clicked', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => { });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Print')?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Add Link')?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('recipe-link-editor');
      const props = modalOptions.componentProps as { parentRecipeId?: number } | undefined;
      expect(props?.parentRecipeId).toBe(1);

      const putReq = requests.find(r => r.url.match(/\/recipes\/1\/links\/99$/) && r.method === 'PUT');
      expect(putReq).toBeDefined();
    });

    it('cancels add link when modal is dismissed without data', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Add Link')?.click();
      await waitForChanges();

      const putReq = requests.find(r => r.url.match(/\/recipes\/1\/links/) && r.method === 'PUT');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Add Link')?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to add linked recipe.' })
      );
    });

    it('deletes link upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/links\/2$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('deleteLinkClicked', { detail: mockLinks[0] }));
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalled();
      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('Remove Link?');
      expect(alertOptions.message as string).toContain('Waffles');

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1\/links\/2$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('cancels delete link when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('deleteLinkClicked', { detail: mockLinks[0] }));
      await waitForChanges();

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1\/links\/2$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
    });

    it('shows toast error when deleting link fails or link id is null', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/links\/2$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const recipeViewer = root.querySelector('recipe-viewer');
      recipeViewer?.dispatchEvent(new CustomEvent('deleteLinkClicked', { detail: mockLinks[0] }));
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to remove linked recipe.' })
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Add Note')?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('note-editor');

      const postReq = requests.find(r => r.url.match(/\/recipes\/1\/notes$/) && r.method === 'POST');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Add Note')?.click();
      await waitForChanges();

      const postReq = requests.find(r => r.url.match(/\/recipes\/1\/notes$/) && r.method === 'POST');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Add Note')?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create note.' })
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const noteCard = root.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('editClicked', { detail: mockNotes[0] }));
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('note-editor');
      const props = modalOptions.componentProps as { note?: Note } | undefined;
      expect(props?.note?.id).toBe(10);

      const putReq = requests.find(r => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'PUT');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const noteCard = root.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('editClicked', { detail: mockNotes[0] }));
      await waitForChanges();

      const putReq = requests.find(r => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'PUT');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const noteCard = root.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('editClicked', { detail: mockNotes[0] }));
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save note.' })
      );
    });

    it('deletes note upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/notes\/10$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const noteCard = root.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('deleteClicked', { detail: mockNotes[0] }));
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Note?' })
      );

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('cancels delete note when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const noteCard = root.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('deleteClicked', { detail: mockNotes[0] }));
      await waitForChanges();

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1\/notes\/10$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
    });

    it('shows toast error when deleting note fails or note has null id', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/notes\/10$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const noteCard = root.querySelector('note-card');
      noteCard?.dispatchEvent(new CustomEvent('deleteClicked', { detail: mockNotes[0] }));
      await waitForChanges();

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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Upload Picture')?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalled();
      const modalOptions = createModalSpy.mock.calls[0][0];
      expect(modalOptions.component).toBe('file-upload-browser');

      expect(createLoadingSpy).toHaveBeenCalled();
      const postReq = requests.find(r => r.url.match(/\/recipes\/1\/images$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
    });

    it('cancels upload picture when modal is dismissed without file', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Upload Picture')?.click();
      await waitForChanges();

      const postReq = requests.find(r => r.url.match(/\/recipes\/1\/images$/) && r.method === 'POST');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getSideMenuItem(root, 'Upload Picture')?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const starBtn = root.querySelector<HTMLIonButtonElement>('ion-card.zoom ion-button:not([color="danger"])');
      expect(starBtn).toBeDefined();
      starBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Set Main Picture?' })
      );

      const patchReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const starBtn = root.querySelector<HTMLIonButtonElement>('ion-card.zoom ion-button:not([color="danger"])');
      starBtn?.click();
      await waitForChanges();

      const patchReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PATCH');
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

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const starBtn = root.querySelector<HTMLIonButtonElement>('ion-card.zoom ion-button:not([color="danger"])');
      starBtn?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to set main picture.' })
      );
    });

    it('deletes image upon confirmation', async () => {
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const deleteImgBtn = root.querySelector<HTMLIonButtonElement>('ion-card.zoom ion-button[color="danger"]');
      expect(deleteImgBtn).toBeDefined();
      deleteImgBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Image?' })
      );

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('cancels delete image when alert is dismissed without confirmation', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const deleteImgBtn = root.querySelector<HTMLIonButtonElement>('ion-card.zoom ion-button[color="danger"]');
      deleteImgBtn?.click();
      await waitForChanges();

      const deleteReq = requests.find(r => r.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && r.method === 'DELETE');
      expect(deleteReq).toBeUndefined();
    });

    it('shows toast error when delete image fails', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes\/1\/images\/pancakes\.jpg$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Error' };
        }
        return defaultFetchResponse(req);
      });

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      const deleteImgBtn = root.querySelector<HTMLIonButtonElement>('ion-card.zoom ion-button[color="danger"]');
      deleteImgBtn?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete image.' })
      );
    });
  });

  describe('Suite 7: Mobile Action Sheet Menu Operations', () => {
    it('creates action sheet with only Print and Cancel for Viewer users', async () => {
      state.currentUser = { id: 99, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const createActionSheetSpy = vi.spyOn(actionSheetController, 'create').mockResolvedValue(mockActionSheet('cancel'));

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getFooterMenuButton(root)?.click();
      await waitForChanges();

      expect(createActionSheetSpy).toHaveBeenCalled();
      const options = createActionSheetSpy.mock.calls[0][0];
      const buttonTexts = options.buttons.map(b => typeof b === 'string' ? b : b.text);
      expect(buttonTexts).toContain('Print');
      expect(buttonTexts).toContain('Cancel');
      expect(buttonTexts).not.toContain('Edit');
      expect(buttonTexts).not.toContain('Add Note');
      expect(buttonTexts).not.toContain('Upload Picture');
      expect(buttonTexts).not.toContain('Add Link');
      expect(buttonTexts).not.toContain('Delete');
      expect(buttonTexts).not.toContain('Archive');
    });

    it('creates action sheet with all editor options for active recipes', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const createActionSheetSpy = vi.spyOn(actionSheetController, 'create').mockResolvedValue(mockActionSheet('cancel'));

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getFooterMenuButton(root)?.click();
      await waitForChanges();

      expect(createActionSheetSpy).toHaveBeenCalled();
      const options = createActionSheetSpy.mock.calls[0][0];
      const buttonTexts = options.buttons.map(b => typeof b === 'string' ? b : b.text);
      expect(buttonTexts).toContain('Print');
      expect(buttonTexts).toContain('Delete');
      expect(buttonTexts).toContain('Archive');
      expect(buttonTexts).toContain('Add Link');
      expect(buttonTexts).toContain('Upload Picture');
      expect(buttonTexts).toContain('Add Note');
      expect(buttonTexts).toContain('Edit');
      expect(buttonTexts).toContain('Cancel');
    });

    it('creates action sheet with Unarchive for archived recipes', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const archivedRecipe: Recipe = { ...mockRecipe, state: RecipeState.Archived };
      setupDefaultFetchMock(archivedRecipe);

      const createActionSheetSpy = vi.spyOn(actionSheetController, 'create').mockResolvedValue(mockActionSheet('cancel'));

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getFooterMenuButton(root)?.click();
      await waitForChanges();

      expect(createActionSheetSpy).toHaveBeenCalled();
      const options = createActionSheetSpy.mock.calls[0][0];
      const buttonTexts = options.buttons.map(b => typeof b === 'string' ? b : b.text);
      expect(buttonTexts).toContain('Unarchive');
      expect(buttonTexts).not.toContain('Archive');
    });

    it('handles action sheet dismissal for each role', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };

      const roles = ['print', 'destructive', 'archive', 'add-link', 'upload-image', 'add-note', 'edit'] as const;

      for (const role of roles) {
        vi.spyOn(actionSheetController, 'create').mockResolvedValue(mockActionSheet(role));
        const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));
        const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));
        const printSpy = vi.spyOn(window, 'print').mockImplementation(() => { });

        const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

        getFooterMenuButton(root)?.click();
        await waitForChanges();

        switch (role) {
          case 'print':
            expect(printSpy).toHaveBeenCalled();
            break;
          case 'destructive':
            expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Delete Recipe?' }));
            break;
          case 'archive':
            expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Arhive Recipe?' }));
            break;
          case 'add-link':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'recipe-link-editor' }));
            break;
          case 'upload-image':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'file-upload-browser' }));
            break;
          case 'add-note':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'note-editor' }));
            break;
          case 'edit':
            expect(createModalSpy).toHaveBeenCalledWith(expect.objectContaining({ component: 'recipe-editor' }));
            break;
        }

        vi.restoreAllMocks();
        setupDefaultFetchMock();
      }
    });

    it('handles action sheet unarchive role for archived recipe', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const archivedRecipe: Recipe = { ...mockRecipe, state: RecipeState.Archived };
      setupDefaultFetchMock(archivedRecipe);

      vi.spyOn(actionSheetController, 'create').mockResolvedValue(mockActionSheet('archive'));
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const { root, waitForChanges } = await render(<page-recipe recipeId={1} />);

      getFooterMenuButton(root)?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Unarchive Recipe?' }));
    });
  });
});
