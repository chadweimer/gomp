import { render, h, describe, it, expect, beforeEach, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
import { AlertButton, alertController, loadingController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../../vitest.setup';
import { AccessLevel, Recipe, RecipeCompact, RecipeState, SortBy, SortDir } from '../../../../generated';
import { SearchViewMode, SwipeDirection } from '../../../../models';
import state, { clearState } from '../../../../stores/state';
import '../page-search';
import { PageSearch } from '../page-search';

let swipeHandler: ((swipe: SwipeDirection) => void) | undefined;
const mockGestureDestroy = vi.fn();
const mockGestureEnable = vi.fn();

vi.mock('../../../../helpers/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../helpers/utils')>();
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
    },
    {
      id: 2,
      name: 'Waffles',
      state: RecipeState.Active,
      rating: 4.0,
      mainImageName: '',
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

  function mockAlert(): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'confirm' }),
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
    localStorage.clear();
    sessionStorage.clear();
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
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    localStorage.clear();
    sessionStorage.clear();
    routerEl?.remove();
    vi.restoreAllMocks();
  });

  describe('Suite 1: Initial Render, View Modes & Scroll Restoration', () => {
    it('builds and hydrates the component', async () => {
      const { root } = await render(<page-search />);
      expect(root).toHaveClass('hydrated');
    });

    it('renders recipes as cards when in Card view mode', async () => {
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.Card };
      state.searchResults = mockRecipes;

      const { root } = await render(<page-search />);

      const cards = root.querySelectorAll('recipe-card');
      expect(cards).toHaveLength(2);
      expect((cards[0] as unknown as { recipe: RecipeCompact }).recipe).toEqual(mockRecipes[0]);
      expect(cards[0].getAttribute('size')).toBe('small');
      expect((cards[1] as unknown as { recipe: RecipeCompact }).recipe).toEqual(mockRecipes[1]);

      const items = root.querySelectorAll('ion-item');
      expect(items).toHaveLength(0);
    });

    it('renders recipes as list items when in List view mode with and without images', async () => {
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.List };
      state.searchResults = mockRecipes;

      const { root } = await render(<page-search />);

      const cards = root.querySelectorAll('recipe-card');
      expect(cards).toHaveLength(0);

      const items = root.querySelectorAll('ion-item');
      expect(items).toHaveLength(2);

      // First item has mainImageName -> renders ion-img
      expect(items[0].getAttribute('href')).toBe('/recipes/1');
      const img1 = items[0].querySelector('ion-img');
      expect(img1).not.toBeNull();
      expect(img1?.getAttribute('src')).toBe('/uploads/recipes/1/thumbs/pancakes.jpg');
      const label1 = items[0].querySelector('ion-label');
      expect(label1?.textContent).toBe('Pancakes');

      // Second item has no mainImageName -> no ion-img
      expect(items[1].getAttribute('href')).toBe('/recipes/2');
      const img2 = items[1].querySelector('ion-img');
      expect(img2).toBeNull();
      const label2 = items[1].querySelector('ion-label');
      expect(label2?.textContent).toBe('Waffles');
    });

    it('handles empty and null search results safely', async () => {
      state.searchResults = [];
      const { root: rootEmpty } = await render(<page-search />);
      expect(rootEmpty.querySelectorAll('recipe-card')).toHaveLength(0);
      expect(rootEmpty.querySelectorAll('ion-item')).toHaveLength(0);

      state.searchResults = undefined;
      const { root: rootNull } = await render(<page-search />);
      expect(rootNull.querySelectorAll('recipe-card')).toHaveLength(0);
      expect(rootNull.querySelectorAll('ion-item')).toHaveLength(0);
    });

    it('toggles view mode between Card and List on button click', async () => {
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.Card };
      const { root } = await render(<page-search />);

      // The 4th header button is viewMode toggle
      const buttons = root.querySelectorAll('ion-header ion-button');
      const viewModeBtn = buttons[3] as HTMLIonButtonElement;
      const icon = viewModeBtn.querySelector('ion-icon');
      expect(icon?.getAttribute('icon')).toBe('grid');

      viewModeBtn.click();
      expect(state.searchSettings.viewMode).toBe(SearchViewMode.List);

      // Now toggle back
      state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.List };
      viewModeBtn.click();
      expect(state.searchSettings.viewMode).toBe(SearchViewMode.Card);
    });

    it('restores scroll position in componentDidRender when searchScrollPosition is present', async () => {
      state.searchScrollPosition = 350;
      const { root, instance } = await render<HTMLElement, PageSearch>(<page-search />);

      const content = root.querySelector('ion-content');
      expect(content).not.toBeNull();

      const scrollToPointSpy = vi.fn().mockResolvedValue(undefined);
      content!.scrollToPoint = scrollToPointSpy;

      instance?.componentDidRender();
      expect(scrollToPointSpy).toHaveBeenCalledWith(0, 350);
    });

    it('catches and logs error if scrollToPoint rejects in componentDidRender', async () => {
      state.searchScrollPosition = 200;
      const { root, instance } = await render<HTMLElement, PageSearch>(<page-search />);

      const content = root.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.scrollToPoint = vi.fn().mockRejectedValue(new Error('Scroll failure'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      instance?.componentDidRender();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('does not scroll if searchScrollPosition is null or undefined', async () => {
      state.searchScrollPosition = undefined as unknown as number;
      const { root, instance } = await render<HTMLElement, PageSearch>(<page-search />);

      const content = root.querySelector('ion-content');
      expect(content).not.toBeNull();

      const scrollToPointSpy = vi.fn().mockResolvedValue(undefined);
      content!.scrollToPoint = scrollToPointSpy;

      instance?.componentDidRender();
      expect(scrollToPointSpy).not.toHaveBeenCalled();
    });

    it('does not throw in componentDidRender if scrollToPoint is not defined on content', async () => {
      state.searchScrollPosition = 120;
      const { root, instance } = await render<HTMLElement, PageSearch>(<page-search />);

      const content = root.querySelector('ion-content');
      expect(content).not.toBeNull();

      delete (content as unknown as { scrollToPoint?: unknown }).scrollToPoint;

      expect(() => instance?.componentDidRender()).not.toThrow();
    });
  });

  describe('Suite 2: Access Control & Create Recipe FAB', () => {
    it('hides create recipe FAB for unauthenticated or Viewer users', async () => {
      state.currentUser = undefined;
      const { root: rootNoUser } = await render(<page-search />);
      expect(rootNoUser.querySelector('ion-fab')).toBeNull();

      state.currentUser = { id: 1, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const { root: rootViewer } = await render(<page-search />);
      expect(rootViewer.querySelector('ion-fab')).toBeNull();
    });

    it('shows create recipe FAB for Editor and Admin users', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };
      const { root: rootEditor } = await render(<page-search />);
      expect(rootEditor.querySelector('ion-fab')).not.toBeNull();

      state.currentUser = { id: 3, username: 'admin', accessLevel: AccessLevel.Admin };
      const { root: rootAdmin } = await render(<page-search />);
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

      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({
        recipe: newRecipeData,
        file: null,
      }));

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

      const { root, waitForChanges } = await render(<page-search />);
      const fabBtn = root.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await waitForChanges();

      // Flush microtasks
      await new Promise(resolve => setTimeout(resolve, 50));

      const postReq = requests.find(r => r.url.endsWith('/recipes') && r.method === 'POST');
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

      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({
        recipe: newRecipeData,
        file: mockFile,
      }));
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

      const { root, waitForChanges } = await render(<page-search />);
      const fabBtn = root.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await waitForChanges();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Uploading picture...' })
      );

      const imageReq = requests.find(r => r.url.includes('/recipes/20/images') && r.method === 'POST');
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

      const { root, waitForChanges } = await render(<page-search />);
      const fabBtn = root.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await waitForChanges();

      await new Promise(resolve => setTimeout(resolve, 50));

      const postReq = requests.find(r => r.method === 'POST');
      expect(postReq).toBeUndefined();
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('shows toast when recipe creation API fails', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({
        recipe: mockFullRecipe,
        file: null,
      }));
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(mockToast());
      vi.spyOn(console, 'error').mockImplementation(() => { });

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/recipes$/) && req.method === 'POST') {
          return { status: 500, body: 'Internal Server Error' };
        }
        return { status: 200, body: JSON.stringify({}) };
      });

      const { root, waitForChanges } = await render(<page-search />);
      const fabBtn = root.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await waitForChanges();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create new recipe.' })
      );
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('shows toast when image upload fails because created recipe ID is null', async () => {
      state.currentUser = { id: 2, username: 'editor', accessLevel: AccessLevel.Editor };

      vi.spyOn(modalController, 'create').mockResolvedValue(mockModal({
        recipe: mockFullRecipe,
        file: new File(['content'], 'file.jpg', { type: 'image/jpeg' }),
      }));
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

      const { root, waitForChanges } = await render(<page-search />);
      const fabBtn = root.querySelector<HTMLIonFabButtonElement>('ion-fab ion-fab-button');
      expect(fabBtn).not.toBeNull();
      fabBtn!.click();
      await waitForChanges();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create new recipe.' })
      );
    });
  });

  describe('Suite 3: Filter, Sort & Pagination Controls', () => {
    it('formats recipe states button text correctly for each combination', async () => {
      // 1. Both Active and Archived -> 'All'
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Active, RecipeState.Archived] };
      const { root: rootAll } = await render(<page-search />);
      const btnAll = rootAll.querySelectorAll('ion-header ion-button')[0];
      expect(btnAll.textContent).toContain('All');

      // 2. Active only -> 'Active'
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Active] };
      const { root: rootActive } = await render(<page-search />);
      const btnActive = rootActive.querySelectorAll('ion-header ion-button')[0];
      expect(btnActive.textContent).toContain('Active');

      // 3. Archived only -> 'Archived'
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Archived] };
      const { root: rootArchived } = await render(<page-search />);
      const btnArchived = rootArchived.querySelectorAll('ion-header ion-button')[0];
      expect(btnArchived.textContent).toContain('Archived');

      // 4. Neither -> 'All'
      state.searchFilter = { ...state.searchFilter, states: [] };
      const { root: rootEmpty } = await render(<page-search />);
      const btnEmpty = rootEmpty.querySelectorAll('ion-header ion-button')[0];
      expect(btnEmpty.textContent).toContain('All');
    });

    it('opens states filter alert and updates state on OK confirmation', async () => {
      state.searchFilter = { ...state.searchFilter, states: [RecipeState.Active] };
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert());

      const { root } = await render(<page-search />);
      const statesBtn = root.querySelectorAll('ion-header ion-button')[0] as HTMLIonButtonElement;
      statesBtn.click();

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('States');
      expect(alertOptions.inputs).toHaveLength(2);
      expect(alertOptions.inputs?.[0].value).toBe(RecipeState.Active);
      expect(alertOptions.inputs?.[0].checked).toBe(true);
      expect(alertOptions.inputs?.[1].value).toBe(RecipeState.Archived);
      expect(alertOptions.inputs?.[1].checked).toBe(false);

      const okButton = alertOptions.buttons?.find(b => typeof b === 'object' && b.text === 'OK') as AlertButton;
      expect(okButton).toBeDefined();

      // Trigger the OK handler
      const handler = okButton.handler as (val: RecipeState[]) => void;
      handler([RecipeState.Archived]);

      expect(state.searchFilter.states).toEqual([RecipeState.Archived]);
    });

    it('opens sort by alert and updates state on OK confirmation', async () => {
      state.searchFilter = { ...state.searchFilter, sortBy: SortBy.Name };
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert());

      const { root } = await render(<page-search />);
      const sortByBtn = root.querySelectorAll('ion-header ion-button')[1] as HTMLIonButtonElement;
      expect(sortByBtn.textContent).toContain('Name');

      sortByBtn.click();

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('Sort By');
      expect(alertOptions.inputs).toHaveLength(Object.keys(SortBy).length);
      expect(alertOptions.inputs?.[0].value).toBe(SortBy.Name);
      expect(alertOptions.inputs?.[0].checked).toBe(true);

      const okButton = alertOptions.buttons?.find(b => typeof b === 'object' && b.text === 'OK') as AlertButton;
      expect(okButton).toBeDefined();

      const handler = okButton.handler as (val: SortBy) => void;
      handler(SortBy.Rating);

      expect(state.searchFilter.sortBy).toBe(SortBy.Rating);
    });

    it('toggles sort direction between Asc and Desc on button click', async () => {
      state.searchFilter = { ...state.searchFilter, sortDir: SortDir.Asc };
      const { root } = await render(<page-search />);

      const sortDirBtn = root.querySelectorAll('ion-header ion-button')[2] as HTMLIonButtonElement;
      const icon = sortDirBtn.querySelector('ion-icon');
      expect(icon?.getAttribute('icon')).toBe('arrow-up');

      sortDirBtn.click();
      expect(state.searchFilter.sortDir).toBe(SortDir.Desc);

      state.searchFilter = { ...state.searchFilter, sortDir: SortDir.Desc };
      sortDirBtn.click();
      expect(state.searchFilter.sortDir).toBe(SortDir.Asc);
    });

    it('opens results per page alert and updates state on OK confirmation', async () => {
      state.searchResultsPerPage = 36;
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert());

      const { root } = await render(<page-search />);
      const resultsPerPageBtn = root.querySelectorAll('ion-header ion-button')[4] as HTMLIonButtonElement;
      expect(resultsPerPageBtn.textContent).toContain('36');

      resultsPerPageBtn.click();

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.header).toBe('Results Per Page');
      expect(alertOptions.inputs).toHaveLength(5);
      expect(alertOptions.inputs?.[0].value).toBe(24);
      expect(alertOptions.inputs?.[1].value).toBe(36);
      expect(alertOptions.inputs?.[1].checked).toBe(true);
      expect(alertOptions.inputs?.[2].value).toBe(60);
      expect(alertOptions.inputs?.[2].checked).toBe(false);

      const okButton = alertOptions.buttons?.find(b => typeof b === 'object' && b.text === 'OK') as AlertButton;
      expect(okButton).toBeDefined();

      const handler = okButton.handler as (val: number) => void;
      handler(60);

      expect(state.searchResultsPerPage).toBe(60);
    });

    it('updates searchPage when page-navigator emits pageChanged event', async () => {
      state.searchPage = 1;
      state.searchNumPages = 5;

      const { root } = await render(<page-search />);
      const navigator = root.querySelector('page-navigator');
      expect(navigator).not.toBeNull();
      expect(navigator?.getAttribute('page')).toBe('1');
      expect(navigator?.getAttribute('numpages')).toBe('5');

      navigator?.dispatchEvent(new CustomEvent('pageChanged', { detail: 3 }));
      expect(state.searchPage).toBe(3);
    });
  });

  describe('Suite 4: Gestures & Content Scrolling', () => {
    it('sets up swipe gesture and handles swipe right to decrease page', async () => {
      state.searchPage = 3;
      state.searchNumPages = 5;

      await render(<page-search />);

      expect(mockGestureEnable).toHaveBeenCalled();
      expect(swipeHandler).toBeDefined();

      swipeHandler?.(SwipeDirection.Right);
      expect(state.searchPage).toBe(2);
    });

    it('does not decrease searchPage below 1 on swipe right', async () => {
      state.searchPage = 1;
      state.searchNumPages = 5;

      await render(<page-search />);

      swipeHandler?.(SwipeDirection.Right);
      expect(state.searchPage).toBe(1);
    });

    it('handles swipe left to increase page', async () => {
      state.searchPage = 2;
      state.searchNumPages = 4;

      await render(<page-search />);

      swipeHandler?.(SwipeDirection.Left);
      expect(state.searchPage).toBe(3);
    });

    it('does not increase searchPage beyond searchNumPages on swipe left', async () => {
      state.searchPage = 4;
      state.searchNumPages = 4;

      await render(<page-search />);

      swipeHandler?.(SwipeDirection.Left);
      expect(state.searchPage).toBe(4);
    });

    it('cleans up gesture on disconnectedCallback', async () => {
      const { instance } = await render<HTMLElement, PageSearch>(<page-search />);
      instance?.disconnectedCallback();

      expect(mockGestureDestroy).toHaveBeenCalled();

      // Calling disconnectedCallback again when gesture is null should not throw
      expect(() => instance?.disconnectedCallback()).not.toThrow();
    });

    it('saves scroll position on ionScrollEnd event when isScrolling is false', async () => {
      const { root } = await render(<page-search />);

      const content = root.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.getScrollElement = vi.fn().mockResolvedValue({ scrollTop: 420 } as HTMLElement);
      content!.dispatchEvent(new CustomEvent('ionScrollEnd', {
        detail: { isScrolling: false }
      }));

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(state.searchScrollPosition).toBe(420);
    });

    it('does not save scroll position when isScrolling is true', async () => {
      state.searchScrollPosition = 100;
      const { root } = await render(<page-search />);

      const content = root.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.getScrollElement = vi.fn().mockResolvedValue({ scrollTop: 500 } as HTMLElement);
      content!.dispatchEvent(new CustomEvent('ionScrollEnd', {
        detail: { isScrolling: true }
      }));

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(state.searchScrollPosition).toBe(100);
    });

    it('handles null scroll element safely when isScrolling is false', async () => {
      const { root } = await render(<page-search />);

      const content = root.querySelector('ion-content');
      expect(content).not.toBeNull();

      content!.getScrollElement = vi.fn().mockResolvedValue(null as unknown as HTMLElement);
      content!.dispatchEvent(new CustomEvent('ionScrollEnd', {
        detail: { isScrolling: false }
      }));

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(state.searchScrollPosition).toBeUndefined();
    });
  });
});
