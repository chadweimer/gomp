import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { modalController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, RecipeCompact, RecipeState, SavedSearchFilter, SavedSearchFilterCompact, SortBy, SortDir, UserSettings } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-home';
import type { PageHome } from './page-home';

describe('page-home', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLElement & { push?: ReturnType<typeof vi.fn> };

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

  function defaultFetchResponse(req: Request, customSettings: UserSettings | null = mockUserSettings) {
    const url = req.url;
    if (url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
      if (customSettings === null) {
        return { status: 404, body: '' };
      }
      return { status: 200, body: JSON.stringify(customSettings) };
    }
    if (url.match(/\/users\/current\/filters\/10$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify(mockSavedFilter10) };
    }
    if (url.match(/\/users\/current\/filters\/11$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify(mockSavedFilter11) };
    }
    if (url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify({ total: mockSavedFilters.length, filters: mockSavedFilters }) };
    }
    if (url.match(/\/recipes\/42\/images$/) && req.method === 'POST') {
      return { status: 200, body: JSON.stringify({}) };
    }
    if (url.match(/\/recipes$/) && req.method === 'POST') {
      return { status: 200, body: JSON.stringify({ id: 42, name: 'New Recipe' }) };
    }
    if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify({ total: 2, recipes: [mockRecipe1, mockRecipe2] }) };
    }
    return { status: 200, body: JSON.stringify({}) };
  }

  function setupDefaultFetchMock(customSettings: UserSettings | null = mockUserSettings) {
    fetchMocker.mockResponse((req: Request) => defaultFetchResponse(req, customSettings));
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMocker.resetMocks();
    clearState();

    routerEl = document.createElement('ion-router') as any;
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

  describe('Initialization & Rendering', () => {
    it('loads and renders user settings and search filters on activatedCallback', async () => {
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const title = el.querySelector('header h1');
      expect(title?.textContent?.trim()).toBe('Welcome to GOMP');

      const img = el.querySelector('header img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('https://example.com/banner.jpg');
      expect(img?.hasAttribute('hidden')).toBe(false);

      // Default 'Recipes' search + 2 saved filters = 3 sections
      const filterItems = el.querySelectorAll('ion-item');
      expect(filterItems).toHaveLength(3);

      const labels = el.querySelectorAll('ion-item ion-label:first-child');
      const labelTexts = Array.from(labels).map(l => l.textContent?.trim());
      expect(labelTexts).toEqual(['Recipes', 'Quick Dinners', 'Desserts']);

      const counts = el.querySelectorAll('ion-item ion-label[slot="end"]');
      const countTexts = Array.from(counts).map(c => c.textContent?.trim());
      expect(countTexts).toEqual(['2', '2', '2']);

      const recipeCards = el.querySelectorAll('recipe-card');
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

      const img = el.querySelector('header img');
      expect(img?.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('Interactions', () => {
    it('navigates to /recipes with filter when clicking a search filter item', async () => {
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const filterItems = el.querySelectorAll<HTMLIonItemElement>('ion-item');
      filterItems[1].click(); // 'Quick Dinners'
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
      expect(state.searchFilter?.query).toBe('dinner');
      expect(state.searchFilter?.tags).toEqual(['quick']);
    });

    it('shows new recipe FAB button for editor users', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fab = el.querySelector('ion-fab');
      expect(fab).not.toBeNull();
    });

    it('hides new recipe FAB button for viewer users', async () => {
      state.currentUser = { id: 2, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const fab = el.querySelector('ion-fab');
      expect(fab).toBeNull();
    });

    it('opens modal when clicking new recipe FAB button', async () => {
      state.currentUser = { id: 1, username: 'editor', accessLevel: AccessLevel.Editor };
      const el = await fixture<PageHome>(html`<page-home></page-home>`);
      await el.activatedCallback();
      await new Promise(resolve => setTimeout(resolve, 50));

      const createSpy = vi.spyOn(modalController, 'create').mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(true),
        onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: 'cancel' }),
      } as any);

      const fabBtn = el.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabBtn?.click();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        component: 'recipe-editor',
      }));
    });
  });
});

