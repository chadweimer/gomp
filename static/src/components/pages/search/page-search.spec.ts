import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, loadingController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, Recipe, RecipeCompact, RecipeState, SortBy, SortDir } from '../../../helpers/schema.gen';
import { SearchViewMode, SwipeDirection } from '../../../models';
import { clearTestStorage, createMockSearchContext, createMockUserContext } from '../../../testing/context-helpers';
import { SearchContextValue, UserContextValue } from '../../../context';
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
  let mockSearchCtx: SearchContextValue;
  let mockUserCtx: UserContextValue;

  async function createSearchPage() {
    return await fixture<PageSearch>(html`<page-search .searchCtx=${mockSearchCtx} .userCtx=${mockUserCtx}></page-search>`);
  }

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

  function mockModal(data: unknown = null, role = 'save'): HTMLIonModalElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data, role }),
    } as unknown as HTMLIonModalElement;
  }

  function mockAlert(role = 'destructive'): HTMLIonAlertElement {
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

  beforeEach(() => {
    clearTestStorage();
    fetchMocker.resetMocks();

    mockSearchCtx = createMockSearchContext({
      results: mockRecipes,
      page: 1,
      numPages: 3,
    });
    mockUserCtx = createMockUserContext({
      user: { id: 1, username: 'admin', accessLevel: AccessLevel.Admin },
    });

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
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearTestStorage();
    routerEl?.remove();
    vi.restoreAllMocks();
  });

  describe('Suite 1: Initial Render, View Modes & Scroll Restoration', () => {
    it('builds and hydrates the component', async () => {
      const root = await createSearchPage();

      // Displays the toolbar
      const buttons = root.renderRoot.querySelectorAll('ion-header ion-button');
      expect(buttons).toHaveLength(7);

      // Displays the pager
      const pager = root.renderRoot.querySelector('page-navigator');
      expect(pager).not.toBeNull();
    });

    it('renders recipes as cards when in Card view mode', async () => {
      mockSearchCtx.settings = { ...mockSearchCtx.settings, viewMode: SearchViewMode.Card };
      mockSearchCtx.results = mockRecipes;

      const root = await createSearchPage();
      await root.updateComplete;

      const cards = root.renderRoot.querySelectorAll('recipe-card');
      expect(cards).toHaveLength(2);
      expect((cards[0] as unknown as { recipe: RecipeCompact }).recipe).toEqual(mockRecipes[0]);
      expect((cards[1] as unknown as { recipe: RecipeCompact }).recipe).toEqual(mockRecipes[1]);

      const items = root.renderRoot.querySelectorAll('ion-item.recipe-item');
      expect(items).toHaveLength(0);
    });

    it('renders recipes as list items when in List view mode with and without images', async () => {
      mockSearchCtx.settings = { ...mockSearchCtx.settings, viewMode: SearchViewMode.List };
      mockSearchCtx.results = mockRecipes;

      const root = await createSearchPage();
      await root.updateComplete;

      const cards = root.renderRoot.querySelectorAll('recipe-card');
      expect(cards).toHaveLength(0);

      const items = root.renderRoot.querySelectorAll('ion-item.recipe-item');
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
      mockSearchCtx.settings = { ...mockSearchCtx.settings, viewMode: SearchViewMode.List };
      mockSearchCtx.results = [
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

      const root = await createSearchPage();
      await root.updateComplete;

      const items = root.renderRoot.querySelectorAll('ion-item.recipe-item');
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
      mockSearchCtx.results = [];
      const rootEmpty = await createSearchPage();
      await rootEmpty.updateComplete;
      expect(rootEmpty.querySelectorAll('recipe-card')).toHaveLength(0);
      expect(rootEmpty.querySelectorAll('ion-item.recipe-item')).toHaveLength(0);

      mockSearchCtx.results = undefined;
      const rootNull = await createSearchPage();
      await rootNull.updateComplete;
      expect(rootNull.querySelectorAll('recipe-card')).toHaveLength(0);
      expect(rootNull.querySelectorAll('ion-item.recipe-item')).toHaveLength(0);
    });

    it('toggles view mode between Card and List on button click', async () => {
      mockSearchCtx.settings = { ...mockSearchCtx.settings, viewMode: SearchViewMode.Card };
      const root = await createSearchPage();
      await root.updateComplete;

      // The 4th header button is viewMode toggle
      const buttons = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button');
      const viewModeBtn = buttons[3];
      const icon = viewModeBtn.querySelector('app-icon');
      expect(icon?.getAttribute('name')).toBe('list_alt');

      viewModeBtn.click();
      expect(mockSearchCtx.settings.viewMode).toBe(SearchViewMode.List);

      // Now toggle back
      mockSearchCtx.settings = { ...mockSearchCtx.settings, viewMode: SearchViewMode.List };
      viewModeBtn.click();
      expect(mockSearchCtx.settings.viewMode).toBe(SearchViewMode.Card);
    });

    it('restores scroll position in updated when searchScrollPosition is present', async () => {
      mockSearchCtx.scrollPosition = 350;
      const root = await createSearchPage();
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      const scrollToPointSpy = vi.fn().mockResolvedValue(undefined);
      content!.scrollToPoint = scrollToPointSpy;

      root.updated();
      expect(scrollToPointSpy).toHaveBeenCalledWith(0, 350);
    });

    it('catches and logs error if scrollToPoint rejects in updated', async () => {
      mockSearchCtx.scrollPosition = 200;
      const root = await createSearchPage();
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
      mockSearchCtx.scrollPosition = undefined;
      const root = await createSearchPage();
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      const scrollToPointSpy = vi.fn().mockResolvedValue(undefined);
      content!.scrollToPoint = scrollToPointSpy;

      root.updated();
      expect(scrollToPointSpy).not.toHaveBeenCalled();
    });

    it('does not throw in updated if scrollToPoint is not defined on content', async () => {
      mockSearchCtx.scrollPosition = 120;
      const root = await createSearchPage();
      await root.updateComplete;

      const content = root.renderRoot.querySelector('ion-content');
      expect(content).not.toBeNull();

      delete (content as unknown as { scrollToPoint?: unknown }).scrollToPoint;

      expect(() => root.updated()).not.toThrow();
    });
  });

  describe('Suite 2: Access Control & Create Recipe FAB', () => {
    it('hides create recipe FAB for unauthenticated or Viewer users', async () => {
      mockUserCtx.user = undefined;
      const rootNoUser = await createSearchPage();
      await rootNoUser.updateComplete;
      expect(rootNoUser.querySelector('ion-fab')).toBeNull();

      mockUserCtx.user = { id: 1, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const rootViewer = await createSearchPage();
      await rootViewer.updateComplete;
      expect(rootViewer.querySelector('ion-fab')).toBeNull();
    });

    it('shows create recipe FAB for Editor and Admin users', async () => {
      mockUserCtx.user = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };
      const rootEditor = await createSearchPage();
      await rootEditor.updateComplete;
      expect(rootEditor.querySelector('ion-fab')).not.toBeNull();

      mockUserCtx.user = { id: 3, username: 'admin', accessLevel: AccessLevel.Admin };
      const rootAdmin = await createSearchPage();
      await rootAdmin.updateComplete;
      expect(rootAdmin.querySelector('ion-fab')).not.toBeNull();
    });

    it('creates new recipe without image and redirects to recipe page', async () => {
      mockUserCtx.user = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

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

      const root = await createSearchPage();
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
      mockUserCtx.user = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

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

      const root = await createSearchPage();
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
      mockUserCtx.user = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(null));

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await createSearchPage();
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
      mockUserCtx.user = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

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

      const root = await createSearchPage();
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
      mockUserCtx.user = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

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

      const root = await createSearchPage();
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
      mockSearchCtx.filter = { ...mockSearchCtx.filter, states: [RecipeState.Active, RecipeState.Archived] };
      const rootAll = await createSearchPage();
      await rootAll.updateComplete;
      const btnAll = rootAll.querySelectorAll('ion-header ion-button')[0];
      expect(btnAll?.textContent?.trim()).toBe('All');

      // 2. Active only -> 'Active'
      mockSearchCtx.filter = { ...mockSearchCtx.filter, states: [RecipeState.Active] };
      const rootActive = await createSearchPage();
      await rootActive.updateComplete;
      const btnActive = rootActive.querySelectorAll('ion-header ion-button')[0];
      expect(btnActive?.textContent?.trim()).toBe('Active');

      // 3. Archived only -> 'Archived'
      mockSearchCtx.filter = { ...mockSearchCtx.filter, states: [RecipeState.Archived] };
      const rootArchived = await createSearchPage();
      await rootArchived.updateComplete;
      const btnArchived = rootArchived.querySelectorAll('ion-header ion-button')[0];
      expect(btnArchived?.textContent?.trim()).toBe('Archived');

      // 4. Neither -> 'All'
      mockSearchCtx.filter = { ...mockSearchCtx.filter, states: [] };
      const rootEmpty = await createSearchPage();
      await rootEmpty.updateComplete;
      const btnEmpty = rootEmpty.querySelectorAll('ion-header ion-button')[0];
      expect(btnEmpty?.textContent?.trim()).toBe('All');
    });

    it('renders states filter popover and updates state on item click', async () => {
      mockSearchCtx.filter = { ...mockSearchCtx.filter, states: [RecipeState.Active] };

      const root = await createSearchPage();
      await root.updateComplete;

      const statesBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('#states-menu');
      expect(statesBtn).not.toBeNull();

      const popover = root.renderRoot.querySelector<HTMLIonPopoverElement>('ion-popover[trigger="states-menu"]');
      expect(popover).not.toBeNull();

      const items = popover?.querySelectorAll<HTMLIonItemElement>('ion-item');
      expect(items).toHaveLength(3);
      expect(items?.[0].textContent?.trim()).toBe('Active');
      expect(items?.[0].getAttribute('color')).toBe('secondary');
      expect(items?.[1].textContent?.trim()).toBe('Archived');
      expect(items?.[1].getAttribute('color')).toBeNull();
      expect(items?.[2].textContent?.trim()).toBe('All');
      expect(items?.[2].getAttribute('color')).toBeNull();

      items?.[1].click();
      await root.updateComplete;

      expect(mockSearchCtx.filter.states).toEqual([RecipeState.Archived]);
    });

    it('renders sort by popover and updates state on item click', async () => {
      mockSearchCtx.filter = { ...mockSearchCtx.filter, sortBy: SortBy.Name };

      const root = await createSearchPage();
      await root.updateComplete;

      const sortByBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('#sort-menu');
      expect(sortByBtn?.textContent?.trim()).toBe('Name');

      const popover = root.renderRoot.querySelector<HTMLIonPopoverElement>('ion-popover[trigger="sort-menu"]');
      expect(popover).not.toBeNull();

      const items = popover?.querySelectorAll<HTMLIonItemElement>('ion-item');
      expect(items).toHaveLength(Object.keys(SortBy).length);

      const nameItem = Array.from(items ?? []).find(item => item.textContent?.trim() === 'Name');
      expect(nameItem?.getAttribute('color')).toBe('secondary');

      const ratingItem = Array.from(items ?? []).find(item => item.textContent?.trim() === 'Rating');
      expect(ratingItem).not.toBeUndefined();
      expect(ratingItem?.getAttribute('color')).toBeNull();

      ratingItem?.click();
      await root.updateComplete;

      expect(mockSearchCtx.filter.sortBy).toBe(SortBy.Rating);
    });

    it('toggles sort direction between Asc and Desc on button click', async () => {
      mockSearchCtx.filter = { ...mockSearchCtx.filter, sortDir: SortDir.Asc };
      const root = await createSearchPage();
      await root.updateComplete;

      const sortDirBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button')[2];
      const icon = sortDirBtn.querySelector('app-icon');
      expect(icon?.getAttribute('name')).toBe('arrow_upward');

      sortDirBtn.click();
      expect(mockSearchCtx.filter.sortDir).toBe(SortDir.Desc);

      mockSearchCtx.filter = { ...mockSearchCtx.filter, sortDir: SortDir.Desc };
      sortDirBtn.click();
      expect(mockSearchCtx.filter.sortDir).toBe(SortDir.Asc);
    });

    it('renders results per page popover and updates state on item click', async () => {
      mockSearchCtx.resultsPerPage = 36;

      const root = await createSearchPage();
      await root.updateComplete;

      const resultsPerPageBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('#results-per-page-menu');
      expect(resultsPerPageBtn?.textContent?.trim()).toBe('36');

      const popover = root.renderRoot.querySelector<HTMLIonPopoverElement>('ion-popover[trigger="results-per-page-menu"]');
      expect(popover).not.toBeNull();

      const items = popover?.querySelectorAll<HTMLIonItemElement>('ion-item');
      expect(items).toHaveLength(5);
      expect(items?.[0].textContent?.trim()).toBe('24');
      expect(items?.[1].textContent?.trim()).toBe('36');
      expect(items?.[1].getAttribute('color')).toBe('secondary');
      expect(items?.[2].textContent?.trim()).toBe('60');
      expect(items?.[2].getAttribute('color')).toBeNull();

      items?.[2].click();
      await root.updateComplete;

      expect(mockSearchCtx.resultsPerPage).toBe(60);
    });

    it('updates searchPage when page-navigator emits pageChanged event', async () => {
      mockSearchCtx.page = 1;
      mockSearchCtx.numPages = 5;

      const root = await createSearchPage();
      await root.updateComplete;

      const navigator = root.renderRoot.querySelector<PageNavigator>('page-navigator');
      expect(navigator).not.toBeNull();
      expect(navigator?.page).toBe(1);
      expect(navigator?.numPages).toBe(5);

      navigator?.dispatchEvent(new CustomEvent('pageChanged', { detail: 3, bubbles: true }));
      expect(mockSearchCtx.page).toBe(3);
    });
  });

  describe('Suite 4: Gestures & Content Scrolling', () => {
    it('sets up swipe gesture and handles swipe right to decrease page', async () => {
      mockSearchCtx.page = 3;
      mockSearchCtx.numPages = 5;

      const root = await createSearchPage();
      await root.updateComplete;

      expect(mockGestureEnable).toHaveBeenCalled();
      expect(swipeHandler).toBeDefined();

      swipeHandler?.(SwipeDirection.Right);
      expect(mockSearchCtx.page).toBe(2);
    });

    it('does not decrease searchPage below 1 on swipe right', async () => {
      mockSearchCtx.page = 1;
      mockSearchCtx.numPages = 5;

      const root = await createSearchPage();
      await root.updateComplete;

      swipeHandler?.(SwipeDirection.Right);
      expect(mockSearchCtx.page).toBe(1);
    });

    it('handles swipe left to increase page', async () => {
      mockSearchCtx.page = 2;
      mockSearchCtx.numPages = 4;

      const root = await createSearchPage();
      await root.updateComplete;

      swipeHandler?.(SwipeDirection.Left);
      expect(mockSearchCtx.page).toBe(3);
    });

    it('does not increase searchPage beyond searchNumPages on swipe left', async () => {
      mockSearchCtx.page = 4;
      mockSearchCtx.numPages = 4;

      const root = await createSearchPage();
      await root.updateComplete;

      swipeHandler?.(SwipeDirection.Left);
      expect(mockSearchCtx.page).toBe(4);
    });

    it('cleans up gesture on disconnectedCallback', async () => {
      const root = await createSearchPage();
      await root.updateComplete;

      root.disconnectedCallback();

      expect(mockGestureDestroy).toHaveBeenCalled();

      // Calling disconnectedCallback again when gesture is null should not throw
      expect(() => root.disconnectedCallback()).not.toThrow();
    });

    it('saves scroll position on ionScrollEnd event when isScrolling is false', async () => {
      const root = await createSearchPage();
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

      expect(mockSearchCtx.scrollPosition).toBe(420);
    });

    it('does not save scroll position when isScrolling is true', async () => {
      mockSearchCtx.scrollPosition = 100;
      const root = await createSearchPage();
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

      expect(mockSearchCtx.scrollPosition).toBe(100);
    });

    it('handles null scroll element safely when isScrolling is false', async () => {
      const root = await createSearchPage();
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

      expect(mockSearchCtx.scrollPosition).toBeUndefined();
    });
  });

  describe('Suite 5: Bulk Selection & Actions', () => {
    it('enters select mode on Select button click and displays bulk toolbar', async () => {
      const root = await createSearchPage();
      await root.updateComplete;

      const selectBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('#select-mode-button');
      expect(selectBtn).not.toBeNull();

      selectBtn!.click();
      await root.updateComplete;

      expect(root.isSelectMode).toBe(true);
      expect(root.renderRoot.querySelector('ion-title')?.textContent).toContain('0 selected');

      // Click close button to exit select mode
      const closeBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-header ion-toolbar ion-buttons ion-button');
      closeBtn!.click();
      await root.updateComplete;

      expect(root.isSelectMode).toBe(false);
      expect(root.selectedIds.size).toBe(0);
    });

    it('enters select mode when recipe card emits card-context-select', async () => {
      const root = await createSearchPage();
      await root.updateComplete;

      const card = root.renderRoot.querySelector('recipe-card');
      expect(card).not.toBeNull();

      card!.dispatchEvent(new CustomEvent('card-context-select', { detail: { recipeId: 1 }, bubbles: true }));
      await root.updateComplete;

      expect(root.isSelectMode).toBe(true);
      expect(root.selectedIds.has(1)).toBe(true);
      expect(root.renderRoot.querySelector('ion-title')?.textContent).toContain('1 selected');
    });

    it('toggles selection on card-toggle-select and toggleSelectAll', async () => {
      const root = await createSearchPage();
      root.enterSelectMode();
      await root.updateComplete;

      // Toggle item 1
      root.toggleSelect(1);
      await root.updateComplete;
      expect(root.selectedIds.has(1)).toBe(true);

      // Toggle item 1 off
      root.toggleSelect(1);
      await root.updateComplete;
      expect(root.selectedIds.has(1)).toBe(false);

      // Select all
      root.toggleSelectAll();
      await root.updateComplete;
      expect(root.selectedIds.size).toBe(mockRecipes.length);

      // Deselect all
      root.toggleSelectAll();
      await root.updateComplete;
      expect(root.selectedIds.size).toBe(0);
    });

    it('executes bulk edit (state and tags) via PATCH /recipes', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(
        mockModal({
          state: RecipeState.Archived,
          addTags: ['quick', 'easy'],
          removeTags: ['slow'],
        }, 'save')
      );
      vi.spyOn(loadingController, 'create').mockResolvedValue(mockLoading());
      vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      let patchBody: unknown = null;
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.endsWith('/recipes') && req.method === 'PATCH') {
          return req.json().then((b) => {
            patchBody = b;
            return { status: 200, body: '' };
          });
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await createSearchPage();
      root.enterSelectMode(1);
      root.toggleSelect(3);
      await root.updateComplete;

      const editBtn = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button'))
        .find((b) => b.textContent?.includes('Edit'));
      expect(editBtn).not.toBeNull();

      editBtn!.click();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(patchBody).toEqual({
        ids: [1, 3],
        state: 'archived',
        addTags: ['quick', 'easy'],
        removeTags: ['slow'],
      });
      expect(root.isSelectMode).toBe(false);
    });

    it('does nothing when edit modal is cancelled', async () => {
      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal(undefined, 'cancel'));

      let patchCalled = false;
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.endsWith('/recipes') && req.method === 'PATCH') {
          patchCalled = true;
          return { status: 200, body: '' };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await createSearchPage();
      root.enterSelectMode(1);
      await root.updateComplete;

      const editBtn = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button'))
        .find((b) => b.textContent?.includes('Edit'));
      editBtn!.click();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(patchCalled).toBe(false);
      expect(root.isSelectMode).toBe(true);
    });

    it('executes bulk delete after confirmation alert via DELETE /recipes', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));
      vi.spyOn(loadingController, 'create').mockResolvedValue(mockLoading());
      vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());

      let deleteUrl = '';
      fetchMocker.mockResponse((req: Request) => {
        if (req.method === 'DELETE' && req.url.includes('/recipes')) {
          deleteUrl = req.url;
          return { status: 200, body: '' };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await createSearchPage();
      root.enterSelectMode(1);
      root.toggleSelect(2);
      await root.updateComplete;

      const deleteBtn = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button'))
        .find((b) => b.textContent?.includes('Delete'));
      expect(deleteBtn).not.toBeNull();

      deleteBtn!.click();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(deleteUrl).toContain('/recipes?');
      expect(deleteUrl).toContain('ids=1');
      expect(deleteUrl).toContain('ids=2');
      expect(root.isSelectMode).toBe(false);
    });

    it('cancels bulk delete when alert is dismissed with cancel role', async () => {
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      let deleteCalled = false;
      fetchMocker.mockResponse((req: Request) => {
        if (req.method === 'DELETE' && req.url.includes('/recipes')) {
          deleteCalled = true;
          return { status: 204, body: '' };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const root = await createSearchPage();
      root.enterSelectMode(1);
      await root.updateComplete;

      const deleteBtn = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-header ion-button'))
        .find((b) => b.textContent?.includes('Delete'));
      deleteBtn!.click();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(deleteCalled).toBe(false);
      expect(root.isSelectMode).toBe(true);
    });
  });
});
