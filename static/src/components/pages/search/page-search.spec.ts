import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, loadingController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, Recipe, RecipeCompact, RecipeState, SortBy, SortDir } from '../../../helpers/schema.gen';
import { SearchViewMode, SwipeDirection } from '../../../models';
import state, { clearState } from '../../../stores/state';
import './page-search';
import { PageSearch } from './page-search';
import { PageNavigator } from '../../page-navigator/page-navigator';

let swipeHandler: ((swipe: SwipeDirection) => void) | undefined;
const mockGestureDestroy = vi.fn();
const mockGestureEnable = vi.fn();

vi.mock('../../../helpers/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../helpers/utils')>();
  return {
    ...actual,
    createSwipeGesture: vi.fn((_el: HTMLElement, handler: (swipe: SwipeDirection) => void) => {
      swipeHandler = handler;
      return {
        enable: mockGestureEnable,
        destroy: mockGestureDestroy,
      };
    }),
  };
});

describe('page-search', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;

  const mockRecipes: RecipeCompact[] = [
    {
      id: 1,
      name: 'Pancakes',
      state: RecipeState.Active,
      rating: 4.5,
      mainImageName: 'pancakes.jpg',
      tags: ['breakfast'],
    },
    {
      id: 2,
      name: 'Waffles',
      state: RecipeState.Active,
      rating: 4.0,
      mainImageName: '',
      tags: ['breakfast'],
    },
  ];

  const mockFullRecipe: Recipe = {
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

  function mockModal(data: unknown = null): HTMLIonModalElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data }),
    } as unknown as HTMLIonModalElement;
  }

  function mockAlert(data?: unknown, role = 'confirm'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
      onDidDismiss: vi.fn().mockResolvedValue({ data, role }),
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

  beforeEach(() => {
    localStorage?.clear();
    sessionStorage?.clear();
    fetchMocker.resetMocks();
    clearState();

    routerEl = document.createElement('ion-router');
    routerEl.push = vi.fn().mockResolvedValue(true);
    document.body.appendChild(routerEl);

    // Default fetch mock returning recipes
    fetchMocker.mockResponse((req: Request) => {
      const url = req.url;
      if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
        return {
          status: 200,
          body: JSON.stringify({ total: mockRecipes.length, recipes: mockRecipes }),
        };
      }
      return {
        status: 200,
        body: JSON.stringify({}),
      };
    });

    state.searchResults = mockRecipes;
    state.searchPage = 1;
    state.searchNumPages = 3;
    state.currentUser = { id: 1, username: 'admin', accessLevel: AccessLevel.Admin };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    localStorage?.clear();
    sessionStorage?.clear();
    routerEl?.remove();
    vi.restoreAllMocks();
  });

  describe('Suite 1: Initial Render, View Modes & Scroll Restoration', () => {
    it('builds and hydrates the component', async () => {
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);

      // Displays the toolbar
      const buttons = root.renderRoot.querySelectorAll('ion-header ion-button');
      expect(buttons).toHaveLength(5);

      // Displays the pager
      const pager = root.renderRoot.querySelector('page-navigator');
      expect(pager).not.toBeNull();
    });

    it('renders recipes as cards when in Card view mode', async () => {
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.Card };
      state.searchResults = mockRecipes;

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const cards = root.renderRoot.querySelectorAll('recipe-card');
      expect(cards).toHaveLength(2);
      expect((cards[0] as unknown as { recipe: RecipeCompact }).recipe).toEqual(mockRecipes[0]);
      expect((cards[1] as unknown as { recipe: RecipeCompact }).recipe).toEqual(mockRecipes[1]);

      const items = root.renderRoot.querySelectorAll('ion-item');
      expect(items).toHaveLength(0);
    });

    it('renders recipes as list items when in List view mode with and without images', async () => {
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.List };
      state.searchResults = mockRecipes;

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const cards = root.renderRoot.querySelectorAll('recipe-card');
      expect(cards).toHaveLength(0);

      const items = root.renderRoot.querySelectorAll('ion-item');
      expect(items).toHaveLength(2);

      // First item has mainImageName -> renders img
      expect(items[0].getAttribute('href')).toBe('/recipes/1');
      expect(items[0].getAttribute('title')).toBe('Pancakes');
      const img1 = items[0].querySelector('img');
      expect(img1).not.toBeNull();
      expect(img1?.getAttribute('src')).toBe('/uploads/recipes/1/thumbs/pancakes.jpg');
      const label1 = items[0].querySelector('ion-label');
      expect(label1?.textContent?.trim()).toBe('Pancakes');

      // Second item has no mainImageName -> no img
      expect(items[1].getAttribute('href')).toBe('/recipes/2');
      expect(items[1].getAttribute('title')).toBe('Waffles');
      const img2 = items[1].querySelector('img');
      expect(img2).toBeNull();
      const label2 = items[1].querySelector('ion-label');
      expect(label2?.textContent?.trim()).toBe('Waffles');
    });

    it('renders archived badge for archived recipes in List view mode', async () => {
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.List };
      state.searchResults = [
        {
          id: 1,
          name: 'Active Recipe',
          state: RecipeState.Active,
          rating: 5,
          mainImageName: '',
          tags: [],
        },
        {
          id: 2,
          name: 'Archived Recipe',
          state: RecipeState.Archived,
          rating: 4,
          mainImageName: '',
          tags: [],
        },
      ];

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const items = root.renderRoot.querySelectorAll('ion-item');
      expect(items).toHaveLength(2);

      // Active recipe: no archived badge
      const activeBadge = items[0].querySelector('ion-badge');
      expect(activeBadge).toBeNull();

      // Archived recipe: archived badge is rendered with proper attributes and text
      const archivedBadge = items[1].querySelector('ion-badge');
      expect(archivedBadge).not.toBeNull();
      expect(archivedBadge?.getAttribute('color')).toBe('medium');
      expect(archivedBadge?.getAttribute('slot')).toBe('end');
      expect(archivedBadge?.textContent?.trim()).toBe('Archived');
    });

    it('handles empty and null search results safely', async () => {
      state.searchResults = [];
      const rootEmpty = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootEmpty.updateComplete;
      expect(rootEmpty.querySelectorAll('recipe-card')).toHaveLength(0);
      expect(rootEmpty.querySelectorAll('ion-item')).toHaveLength(0);

      state.searchResults = undefined;
      const rootNull = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootNull.updateComplete;
      expect(rootNull.querySelectorAll('recipe-card')).toHaveLength(0);
      expect(rootNull.querySelectorAll('ion-item')).toHaveLength(0);
    });

    it('toggles view mode between Card and List on button click', async () => {
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.Card };
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      // The 4th header button is viewMode toggle
      const buttons = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
      const viewModeBtn = buttons[3];
      const icon = viewModeBtn.querySelector('app-icon');
      expect(icon?.getAttribute('name')).toBe('list_alt');

      viewModeBtn.click();
      expect(state.searchSettings.viewMode).toBe(SearchViewMode.List);

      // Now toggle back
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.List };
      viewModeBtn.click();
      expect(state.searchSettings.viewMode).toBe(SearchViewMode.Card);
    });

    it('restores scroll position in updated when searchScrollPosition is present', async () => {
      state.searchScrollPosition = 350;
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      const scrollToPointSpy = vi.fn().mockResolvedValue(undefined);
      content!.scrollToPoint = scrollToPointSpy;

      root.updated();
      expect(scrollToPointSpy).toHaveBeenCalledWith(0, 350);
    });

    it('catches and logs error if scrollToPoint rejects in updated', async () => {
      state.searchScrollPosition = 200;
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.scrollToPoint = vi.fn().mockRejectedValue(new Error('Scroll failure'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      root.updated();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('does not scroll if searchScrollPosition is null or undefined', async () => {
      state.searchScrollPosition = undefined;
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      const scrollToPointSpy = vi.fn().mockResolvedValue(undefined);
      content!.scrollToPoint = scrollToPointSpy;

      root.updated();
      expect(scrollToPointSpy).not.toHaveBeenCalled();
    });

    it('does not throw in updated if scrollToPoint is not defined on content', async () => {
      state.searchScrollPosition = 120;
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      delete (content as unknown as { scrollToPoint?: unknown }).scrollToPoint;

      expect(() => root.updated()).not.toThrow();
    });
  });

  describe('Suite 2: Access Control & Create Recipe FAB', () => {
    it('hides create recipe FAB for unauthenticated or Viewer users', async () => {
      state.currentUser = undefined;
      const rootNoUser = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootNoUser.updateComplete;
      expect(rootNoUser.querySelector('ion-fab')).toBeNull();

      state.currentUser = { id: 1, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const rootViewer = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootViewer.updateComplete;
      expect(rootViewer.querySelector('ion-fab')).toBeNull();
    });

    it('shows create recipe FAB for Editor and Admin users', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };
      const rootEditor = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootEditor.updateComplete;
      expect(rootEditor.querySelector('ion-fab')).not.toBeNull();

      state.currentUser = { id: 3, username: 'admin', accessLevel: AccessLevel.Admin };
      const rootAdmin = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootAdmin.updateComplete;
      expect(rootAdmin.querySelector('ion-fab')).not.toBeNull();
    });

    it('creates new recipe without image and redirects to recipe page', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      const newRecipeData: Recipe = {
        ...mockFullRecipe,
        name: 'French Toast',
      };
      const createdRecipe: Recipe = {
        ...newRecipeData,
        id: 15,
      };

      vi.spyOn(modalController, 'create').mockResolvedValue(
        mockModal({
          recipe: newRecipeData,
          file: null,
        })
      );

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return {
            status: 201,
            body: JSON.stringify(createdRecipe),
          };
        }
        if (req.url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
          return {
            status: 200,
            body: JSON.stringify({ total: 1, recipes: [createdRecipe] }),
          };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const fabBtn = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await root.updateComplete;

      // Flush microtasks
      await new Promise((resolve) => setTimeout(resolve, 50));

      const postReq = requests.find((r) => r.url.endsWith('/recipes') && r.method === 'POST');
      expect(postReq).toBeDefined();

      expect(routerEl.push).toHaveBeenCalledWith('/recipes/15');
    });

    it('creates new recipe with image, showing loading overlay and redirecting', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      const newRecipeData: Recipe = {
        ...mockFullRecipe,
        name: 'Blueberry Muffin',
      };
      const createdRecipe: Recipe = {
        ...newRecipeData,
        id: 20,
      };
      const mockFile = new File(['mock content'], 'muffin.jpg', { type: 'image/jpeg' });

      vi.spyOn(modalController, 'create').mockResolvedValue(
        mockModal({
          recipe: newRecipeData,
          file: mockFile,
        })
      );
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(mockLoading());

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return {
            status: 201,
            body: JSON.stringify(createdRecipe),
          };
        }
        if (req.url.match(/\/recipes\/20\/images$/) && req.method === 'POST') {
          return {
            status: 201,
            body: JSON.stringify({}),
          };
        }
        if (req.url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
          return {
            status: 200,
            body: JSON.stringify({ total: 1, recipes: [createdRecipe] }),
          };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const fabBtn = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await root.updateComplete;

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Uploading picture...' })
      );

      const imageReq = requests.find((r) => r.url.includes('/recipes/20/images') && r.method === 'POST');
      expect(imageReq).toBeDefined();

      expect(routerEl.push).toHaveBeenCalledWith('/recipes/20');
    });

    it('does nothing when recipe editor modal is dismissed without data', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const fabBtn = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await root.updateComplete;

      await new Promise((resolve) => setTimeout(resolve, 50));

      const postReq = requests.find((r) => r.method === 'POST');
      expect(postReq).toBeUndefined();
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('shows toast when recipe creation API fails', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      vi.spyOn(modalController, 'create').mockResolvedValue(
        mockModal({
          recipe: mockFullRecipe,
          file: null,
        })
      );
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());
      vi.spyOn(console, 'error').mockImplementation(() => { });

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return { status: 500, body: 'Internal Server Error' };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const fabBtn = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await root.updateComplete;

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create new recipe.' })
      );
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('shows toast when image upload fails because created recipe ID is null', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      vi.spyOn(modalController, 'create').mockResolvedValue(
        mockModal({
          recipe: mockFullRecipe,
          file: new File(['content'], 'file.jpg', { type: 'image/jpeg' }),
        })
      );
      vi.spyOn(loadingController, 'create').mockResolvedValue(mockLoading());
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());
      vi.spyOn(console, 'error').mockImplementation(() => { });

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return {
            status: 201,
            body: JSON.stringify({ ...mockFullRecipe, id: null }),
          };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const fabBtn = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await root.updateComplete;

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create new recipe.' })
      );
    });
  });

  describe('Suite 3: Filter, Sort & Pagination Controls', () => {
    it('formats recipe states button text correctly for each combination', async () => {
      // 1. Both Active and Archived -> 'All'
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Active, RecipeState.Archived] };
      const rootAll = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootAll.updateComplete;
      const btnAll = rootAll.querySelectorAll('ion-header ion-button')[0];
      expect(btnAll?.textContent?.trim()).toBe('All');

      // 2. Active only -> 'Active'
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Active] };
      const rootActive = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootActive.updateComplete;
      const btnActive = rootActive.querySelectorAll('ion-header ion-button')[0];
      expect(btnActive?.textContent?.trim()).toBe('Active');

      // 3. Archived only -> 'Archived'
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Archived] };
      const rootArchived = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootArchived.updateComplete;
      const btnArchived = rootArchived.querySelectorAll('ion-header ion-button')[0];
      expect(btnArchived?.textContent?.trim()).toBe('Archived');

      // 4. Neither -> 'All'
      state.searchFilter = { ...state.searchFilter, states: [] };
      const rootEmpty = await fixture<PageSearch>(html`<page-search></page-search>`);
      await rootEmpty.updateComplete;
      const btnEmpty = rootEmpty.querySelectorAll('ion-header ion-button')[0];
      expect(btnEmpty?.textContent?.trim()).toBe('All');
    });

    it('opens states filter alert and updates state on OK confirmation', async () => {
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Active] };
      const alert = mockAlert({ values: [RecipeState.Archived] }, 'confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const statesBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button')[0];
      statesBtn.click();
      await root.updateComplete;

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('States');
      expect(alertOptions.inputs).toHaveLength(2);
      expect(alertOptions.inputs?.[0].value).toBe(RecipeState.Active);
      expect(alertOptions.inputs?.[0].checked).toBe(true);
      expect(alertOptions.inputs?.[1].value).toBe(RecipeState.Archived);
      expect(alertOptions.inputs?.[1].checked).toBe(false);

      await alert.dismiss();
      await root.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(state.searchFilter.states).toEqual([RecipeState.Archived]);
    });

    it('opens sort by alert and updates state on OK confirmation', async () => {
      state.searchFilter = { ...state.searchFilter, sortBy: SortBy.Name };
      const alert = mockAlert({ values: SortBy.Rating }, 'confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const sortByBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button')[1];
      expect(sortByBtn?.textContent?.trim()).toBe('Name');

      sortByBtn.click();
      await root.updateComplete;

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('Sort By');
      expect(alertOptions.inputs).toHaveLength(Object.keys(SortBy).length);
      expect(alertOptions.inputs?.[0].value).toBe(SortBy.Name);
      expect(alertOptions.inputs?.[0].checked).toBe(true);

      await alert.dismiss();
      await root.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(state.searchFilter.sortBy).toBe(SortBy.Rating);
    });

    it('toggles sort direction between Asc and Desc on button click', async () => {
      state.searchFilter = { ...state.searchFilter, sortDir: SortDir.Asc };
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const sortDirBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button')[2];
      const icon = sortDirBtn.querySelector('app-icon');
      expect(icon?.getAttribute('name')).toBe('arrow_upward');

      sortDirBtn.click();
      expect(state.searchFilter.sortDir).toBe(SortDir.Desc);

      state.searchFilter = { ...state.searchFilter, sortDir: SortDir.Desc };
      sortDirBtn.click();
      expect(state.searchFilter.sortDir).toBe(SortDir.Asc);
    });

    it('opens results per page alert and updates state on OK confirmation', async () => {
      state.searchResultsPerPage = 36;
      const alert = mockAlert({ values: 60 }, 'confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const resultsPerPageBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button')[4];
      expect(resultsPerPageBtn?.textContent?.trim()).toBe('36');

      resultsPerPageBtn.click();
      await root.updateComplete;

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('Results Per Page');
      expect(alertOptions.inputs).toHaveLength(5);
      expect(alertOptions.inputs?.[0].value).toBe(24);
      expect(alertOptions.inputs?.[1].value).toBe(36);
      expect(alertOptions.inputs?.[1].checked).toBe(true);
      expect(alertOptions.inputs?.[2].value).toBe(60);
      expect(alertOptions.inputs?.[2].checked).toBe(false);

      await alert.dismiss();
      await root.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(state.searchResultsPerPage).toBe(60);
    });

    it('updates searchPage when page-navigator emits pageChanged event', async () => {
      state.searchPage = 1;
      state.searchNumPages = 5;

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const navigator = root.renderRoot.querySelector<PageNavigator>('page-navigator');
      expect(navigator).not.toBeNull();
      expect(navigator?.page).toBe(1);
      expect(navigator?.numPages).toBe(5);

      navigator?.dispatchEvent(new CustomEvent('pageChanged', { detail: 3, bubbles: true }));
      expect(state.searchPage).toBe(3);
    });
  });

  describe('Suite 4: Gestures & Content Scrolling', () => {
    it('sets up swipe gesture and handles swipe right to decrease page', async () => {
      state.searchPage = 3;
      state.searchNumPages = 5;

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      expect(mockGestureEnable).toHaveBeenCalled();
      expect(swipeHandler).toBeDefined();

      swipeHandler?.(SwipeDirection.Right);
      expect(state.searchPage).toBe(2);
    });

    it('does not decrease searchPage below 1 on swipe right', async () => {
      state.searchPage = 1;
      state.searchNumPages = 5;

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      swipeHandler?.(SwipeDirection.Right);
      expect(state.searchPage).toBe(1);
    });

    it('handles swipe left to increase page', async () => {
      state.searchPage = 2;
      state.searchNumPages = 4;

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      swipeHandler?.(SwipeDirection.Left);
      expect(state.searchPage).toBe(3);
    });

    it('does not increase searchPage beyond searchNumPages on swipe left', async () => {
      state.searchPage = 4;
      state.searchNumPages = 4;

      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      swipeHandler?.(SwipeDirection.Left);
      expect(state.searchPage).toBe(4);
    });

    it('cleans up gesture on disconnectedCallback', async () => {
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      root.disconnectedCallback();

      expect(mockGestureDestroy).toHaveBeenCalled();

      // Calling disconnectedCallback again when gesture is null should not throw
      expect(() => root.disconnectedCallback()).not.toThrow();
    });

    it('saves scroll position on ionScrollEnd event when isScrolling is false', async () => {
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.getScrollElement = vi.fn().mockResolvedValue({ scrollTop: 420 });
      content!.dispatchEvent(
        new CustomEvent('ionScrollEnd', {
          detail: { isScrolling: false },
          bubbles: true,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(state.searchScrollPosition).toBe(420);
    });

    it('does not save scroll position when isScrolling is true', async () => {
      state.searchScrollPosition = 100;
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.getScrollElement = vi.fn().mockResolvedValue({ scrollTop: 500 });
      content!.dispatchEvent(
        new CustomEvent('ionScrollEnd', {
          detail: { isScrolling: true },
          bubbles: true,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(state.searchScrollPosition).toBe(100);
    });

    it('handles null scroll element safely when isScrolling is false', async () => {
      const root = await fixture<PageSearch>(html`<page-search></page-search>`);
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.getScrollElement = vi.fn().mockResolvedValue(null);
      content!.dispatchEvent(
        new CustomEvent('ionScrollEnd', {
          detail: { isScrolling: false },
          bubbles: true,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(state.searchScrollPosition).toBeUndefined();
    });
  });
});
