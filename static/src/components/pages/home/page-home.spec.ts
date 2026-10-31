import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadingController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, Recipe, RecipeCompact, RecipeState, SavedSearchFilter, SavedSearchFilterCompact, SortBy, SortDir, UserSettings } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-home';
import { PageHome } from './page-home';

describe('page-home', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;

  const mockUserSettings: UserSettings = {
    userId: 1,
    homeTitle: 'Welcome to GOMP',
    homeImageUrl: 'https://example.com/banner.jpg',
    favoriteTags: ['dinner'],
  };

  const mockRecipe1: RecipeCompact = {
    id: 1,
    name: 'Pancakes',
    state: RecipeState.Active,
    rating: 5,
    mainImageName: 'pancakes.jpg',
    tags: ['breakfast'],
  };

  const mockRecipe2: RecipeCompact = {
    id: 2,
    name: 'Waffles',
    state: RecipeState.Active,
    rating: 4,
    mainImageName: 'waffles.jpg',
    tags: ['breakfast'],
  };

  const mockSavedFilters: SavedSearchFilterCompact[] = [
    { id: 10, name: 'Quick Dinners' },
    { id: 11, name: 'Desserts' },
  ];

  const mockSavedFilter10: SavedSearchFilter = {
    id: 10,
    name: 'Quick Dinners',
    query: 'dinner',
    withPictures: null,
    sortBy: SortBy.Name,
    sortDir: SortDir.Asc,
    fields: [],
    states: [RecipeState.Active],
    tags: ['quick'],
  };

  const mockSavedFilter11: SavedSearchFilter = {
    id: 11,
    name: 'Desserts',
    query: 'dessert',
    withPictures: null,
    sortBy: SortBy.Name,
    sortDir: SortDir.Asc,
    fields: [],
    states: [RecipeState.Active],
    tags: ['sweet'],
  };

  const mockNewRecipe: Recipe = {
    id: 42,
    name: 'Blueberry Pancakes',
    state: RecipeState.Active,
    rating: 0,
    servingSize: '4',
    time: '20 mins',
    nutritionInfo: '',
    ingredients: 'Flour, Milk, Blueberries',
    directions: 'Mix and cook',
    storageInstructions: '',
    sourceUrl: '',
    mainImageName: '',
    tags: ['breakfast'],
  };

  function mockModal(data: unknown = null): HTMLIonModalElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
      onDidDismiss: vi.fn().mockResolvedValue({ data }),
    } as unknown as HTMLIonModalElement;
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

  function defaultFetchResponse(req: Request, customSettings: UserSettings | null = mockUserSettings) {
    const url = req.url;
    if (url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
      if (customSettings === null) {
        return Promise.resolve({ status: 404, body: '' });
      }
      return Promise.resolve(JSON.stringify(customSettings));
    }
    if (url.match(/\/users\/current\/filters\/10$/) && req.method === 'GET') {
      return Promise.resolve(JSON.stringify(mockSavedFilter10));
    }
    if (url.match(/\/users\/current\/filters\/11$/) && req.method === 'GET') {
      return Promise.resolve(JSON.stringify(mockSavedFilter11));
    }
    if (url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
      return Promise.resolve(JSON.stringify({ total: mockSavedFilters.length, filters: mockSavedFilters }));
    }
    if (url.match(/\/recipes\/42\/images$/) && req.method === 'POST') {
      return Promise.resolve(JSON.stringify({}));
    }
    if (url.match(/\/recipes$/) && req.method === 'POST') {
      return Promise.resolve(JSON.stringify({ id: 42, name: 'New Recipe' }));
    }
    if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
      return Promise.resolve(JSON.stringify({ total: 2, recipes: [mockRecipe1, mockRecipe2] }));
    }
    return Promise.resolve('{}');
  }

  function setupDefaultFetchMock(customSettings: UserSettings | null = mockUserSettings) {
    fetchMocker.mockResponse((req: Request) => defaultFetchResponse(req, customSettings));
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

  describe('Suite 1: Initialization & Rendering', () => {
    it('builds and renders initial empty state before activation', async () => {
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      const title = el.renderRoot.querySelector('header h1');
      expect(title?.textContent?.trim()).toBe('');

      const items = el.renderRoot.querySelectorAll('ion-item');
      expect(items).toHaveLength(0);
    });

    it('loads and renders user settings and search filters on activatedCallback', async () => {
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const title = el.renderRoot.querySelector('header h1');
      expect(title?.textContent?.trim()).toBe('Welcome to GOMP');

      const img = el.renderRoot.querySelector('header img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('https://example.com/banner.jpg');
      expect(img?.hasAttribute('hidden')).toBe(false);

      // Default 'Recipes' search + 2 saved filters = 3 sections
      const filterItems = el.renderRoot.querySelectorAll('ion-item');
      expect(filterItems).toHaveLength(3);

      const labels = el.renderRoot.querySelectorAll('ion-item ion-label:first-child');
      const labelTexts = Array.from(labels).map(l => l.textContent?.trim());
      expect(labelTexts).toEqual(['Recipes', 'Quick Dinners', 'Desserts']);

      const counts = el.renderRoot.querySelectorAll('ion-item ion-label[slot="end"]');
      const countTexts = Array.from(counts).map(c => c.textContent?.trim());
      expect(countTexts).toEqual(['2', '2', '2']);

      const recipeCards = el.renderRoot.querySelectorAll('recipe-card');
      expect(recipeCards).toHaveLength(6);
    });

    it('hides header image when homeImageUrl is empty', async () => {
      setupDefaultFetchMock({
        ...mockUserSettings,
        homeImageUrl: '',
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const img = el.renderRoot.querySelector('header img');
      expect(img?.hasAttribute('hidden')).toBe(true);
    });

    it('skips saved filters with null or undefined id', async () => {
      fetchMocker.mockResponse((req: Request) => {
        const url = req.url;
        if (url.match(/\/users\/current\/settings$/)) {
          return Promise.resolve(JSON.stringify(mockUserSettings));
        }
        if (url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return Promise.resolve(
            JSON.stringify({
              total: 2,
              filters: [
                { id: null, name: 'Invalid Filter' },
                { id: 10, name: 'Quick Dinners' },
              ],
            })
          );
        }
        if (url.match(/\/users\/current\/filters\/10$/)) {
          return Promise.resolve(JSON.stringify(mockSavedFilter10));
        }
        if (url.match(/\/recipes(\?.*)?$/)) {
          return Promise.resolve(JSON.stringify({ total: 1, recipes: [mockRecipe1] }));
        }
        return Promise.resolve('{}');
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const filterItems = el.renderRoot.querySelectorAll('ion-item');
      expect(filterItems).toHaveLength(2); // Recipes + Quick Dinners
    });
  });

  describe('Suite 2: Access Control (RBAC)', () => {
    it('hides new recipe FAB button for unauthenticated users', async () => {
      state.currentUser = undefined;
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fab = el.renderRoot.querySelector('ion-fab');
      expect(fab).toBeNull();
    });

    it('hides new recipe FAB button for viewers', async () => {
      state.currentUser = { id: 2, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fab = el.renderRoot.querySelector('ion-fab');
      expect(fab).toBeNull();
    });

    it('shows new recipe FAB button for editors', async () => {
      state.currentUser = { id: 3, username: 'editor', accessLevel: AccessLevel.Editor };
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fab = el.renderRoot.querySelector('ion-fab');
      expect(fab).not.toBeNull();
      const fabBtn = fab?.querySelector('ion-fab-button');
      expect(fabBtn).not.toBeNull();
    });

    it('shows new recipe FAB button for admins', async () => {
      state.currentUser = { id: 4, username: 'admin', accessLevel: AccessLevel.Admin };
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fab = el.renderRoot.querySelector('ion-fab');
      expect(fab).not.toBeNull();
    });
  });

  describe('Suite 3: Filter Navigation', () => {
    it('updates searchFilter store and redirects to /recipes when a filter is clicked', async () => {
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const filterItems = el.renderRoot.querySelectorAll<HTMLIonItemElement>('ion-item');
      expect(filterItems.length).toBeGreaterThanOrEqual(2);

      // Click the second filter ('Quick Dinners')
      filterItems[1].click();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(state.searchFilter.query).toBe('dinner');
      expect(state.searchFilter.tags).toEqual(['quick']);
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });

    it('redirects with default filter when all Recipes item is clicked', async () => {
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const firstItem = el.renderRoot.querySelector<HTMLIonItemElement>('ion-item');
      expect(firstItem).not.toBeNull();
      firstItem?.click();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(state.searchFilter.sortBy).toBe(SortBy.Random);
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });
  });

  describe('Suite 4: Recipe Creation', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
    });

    it('opens recipe editor modal on FAB button click and saves recipe without image', async () => {
      const modal = mockModal({ recipe: mockNewRecipe, file: null });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return Promise.resolve(JSON.stringify({ id: 42, ...mockNewRecipe }));
        }
        return defaultFetchResponse(req);
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fabBtn = el.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'recipe-editor',
          backdropDismiss: false,
        })
      );
      expect(modal.present).toHaveBeenCalled();

      const postReq = requests.find(r => r.url.match(/\/recipes$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
      const body = (await postReq?.clone().json()) as Recipe;
      expect(body.name).toBe('Blueberry Pancakes');

      expect(routerEl.push).toHaveBeenCalledWith('/recipes/42');
    });

    it('saves recipe and uploads image when file is provided', async () => {
      const mockFile = new File(['image-bits'], 'pancakes.png', { type: 'image/png' });
      const modal = mockModal({ recipe: mockNewRecipe, file: mockFile });
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);
      const loading = mockLoading();
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(loading);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes\/42\/images$/) && req.method === 'POST') {
          return Promise.resolve(JSON.stringify({}));
        }
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return Promise.resolve(JSON.stringify({ id: 42, ...mockNewRecipe }));
        }
        return defaultFetchResponse(req);
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fabBtn = el.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabBtn?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Uploading picture...' })
      );
      expect(loading.present).toHaveBeenCalled();
      expect(loading.dismiss).toHaveBeenCalled();

      const imageReq = requests.find(r => r.url.match(/\/recipes\/42\/images$/) && r.method === 'POST');
      expect(imageReq).toBeDefined();

      expect(routerEl.push).toHaveBeenCalledWith('/recipes/42');
    });

    it('does nothing when modal is dismissed without data', async () => {
      const modal = mockModal(null);
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return defaultFetchResponse(req);
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fabBtn = el.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabBtn?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const postReq = requests.find(r => r.url.match(/\/recipes$/) && r.method === 'POST');
      expect(postReq).toBeUndefined();
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('displays toast error when recipe creation fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const modal = mockModal({ recipe: mockNewRecipe, file: null });
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return Promise.resolve({ status: 500, body: 'Server error' });
        }
        return defaultFetchResponse(req);
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fabBtn = el.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabBtn?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create new recipe.' })
      );
      expect(toast.present).toHaveBeenCalled();
      expect(routerEl.push).not.toHaveBeenCalled();
    });
  });

  describe('Suite 5: Error Handling during Data Fetching', () => {
    it('gracefully handles user settings failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      setupDefaultFetchMock(null);

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const title = el.renderRoot.querySelector('header h1');
      expect(title?.textContent?.trim()).toBe('');
      // Search filters still loaded
      const items = el.renderRoot.querySelectorAll('ion-item');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('gracefully handles search filters fetch failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      fetchMocker.mockResponse((req: Request) => {
        const url = req.url;
        if (url.match(/\/users\/current\/settings$/)) {
          return Promise.resolve(JSON.stringify(mockUserSettings));
        }
        if (url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return Promise.resolve({ status: 500, body: 'Error fetching filters' });
        }
        if (url.match(/\/recipes(\?.*)?$/)) {
          return Promise.resolve(JSON.stringify({ total: 1, recipes: [mockRecipe1] }));
        }
        return Promise.resolve('{}');
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(consoleErrorSpy).toHaveBeenCalled();
      const items = el.renderRoot.querySelectorAll('ion-item');
      expect(items).toHaveLength(0);
    });

    it('shows toast and returns empty results when performRecipeSearch fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      fetchMocker.mockResponse((req: Request) => {
        const url = req.url;
        if (url.match(/\/users\/current\/settings$/)) {
          return Promise.resolve(JSON.stringify(mockUserSettings));
        }
        if (url.match(/\/users\/current\/filters(\?.*)?$/)) {
          return Promise.resolve(JSON.stringify({ total: 0, filters: [] }));
        }
        if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
          return Promise.resolve({ status: 500, body: 'Search error' });
        }
        return Promise.resolve('{}');
      });

      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred attempting to perform the current search.',
        })
      );
      expect(toast.present).toHaveBeenCalled();

      const items = el.renderRoot.querySelectorAll('ion-item');
      expect(items).toHaveLength(1);
      const countLabel = items[0].querySelector('ion-label[slot="end"]');
      expect(countLabel?.textContent?.trim()).toBe('0');
      const recipeCards = el.renderRoot.querySelectorAll('recipe-card');
      expect(recipeCards).toHaveLength(0);
    });
  });
});
