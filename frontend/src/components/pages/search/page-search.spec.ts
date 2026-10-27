import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, RecipeCompact, RecipeState, SearchResult, SortDir } from '../../../helpers/schema.gen';
import { SearchViewMode, SwipeDirection } from '../../../models';
import state, { clearState } from '../../../stores/state';
import './page-search';
import { PageSearch } from './page-search';

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

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMocker.resetMocks();
    clearState();

    fetchMocker.mockResponse((req: Request) => {
      const url = req.url;
      if (url.match(/\/recipes(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(
          JSON.stringify({ total: mockRecipes.length, recipes: mockRecipes } as SearchResult)
        );
      }
      return Promise.resolve(JSON.stringify({}));
    });

    state.searchResults = mockRecipes;
    state.searchPage = 1;
    state.searchNumPages = 3;
    state.currentUser = { id: 1, username: 'admin', accessLevel: AccessLevel.Admin };
  });

  afterEach(() => {
    clearState();
    vi.restoreAllMocks();
  });

  it('renders search results in card view mode by default', async () => {
    state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.Card };
    const el = await fixture<PageSearch>(html`<page-search></page-search>`);

    const cards = el.querySelectorAll('recipe-card');
    expect(cards).toHaveLength(2);
  });

  it('renders search results in list view mode when viewMode is List', async () => {
    state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.List };
    const el = await fixture<PageSearch>(html`<page-search></page-search>`);

    const items = el.querySelectorAll('ion-item');
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('toggles sort direction when button is clicked', async () => {
    state.searchFilter = { ...state.searchFilter, sortDir: SortDir.Asc };
    const el = await fixture<PageSearch>(html`<page-search></page-search>`);

    const buttons = el.querySelectorAll('ion-header ion-button');
    // 3rd button is sort dir
    const sortDirBtn = buttons[2] as HTMLElement;
    sortDirBtn.click();

    expect(state.searchFilter.sortDir).toBe(SortDir.Desc);
  });

  it('toggles view mode when view mode button is clicked', async () => {
    state.searchSettings = { ...state.searchSettings, viewMode: SearchViewMode.Card };
    const el = await fixture<PageSearch>(html`<page-search></page-search>`);

    const buttons = el.querySelectorAll('ion-header ion-button');
    // 4th button is view mode
    const viewModeBtn = buttons[3] as HTMLElement;
    viewModeBtn.click();

    expect(state.searchSettings.viewMode).toBe(SearchViewMode.List);
  });

  it('navigates page via page-navigator event', async () => {
    const el = await fixture<PageSearch>(html`<page-search></page-search>`);

    const navigator = el.querySelector('page-navigator') as HTMLElement;
    navigator.dispatchEvent(new CustomEvent('pageChanged', { detail: 2, bubbles: true }));

    expect(state.searchPage).toBe(2);
  });

  it('responds to swipe gesture for pagination', async () => {
    await fixture<PageSearch>(html`<page-search></page-search>`);
    expect(swipeHandler).toBeDefined();

    // Swipe left moves to next page
    swipeHandler!(SwipeDirection.Left);
    expect(state.searchPage).toBe(2);

    // Swipe right moves to previous page
    swipeHandler!(SwipeDirection.Right);
    expect(state.searchPage).toBe(1);
  });
});
