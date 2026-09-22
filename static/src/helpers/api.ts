import createClient from 'openapi-fetch';
import { paths, SavedSearchFilterCompact, SearchFilter, UserSettings } from '../api/schema.gen';
import state, { getDefaultSearchFilter, onStateChange } from '../stores/state';
import { isNull, toYesNoAny } from './utils';

// Retrieve search results when search filters change
const propsToSearch: (keyof typeof state)[] = ['searchSettings', 'searchFilter', 'searchPage', 'searchResultsPerPage'];
for (const prop of propsToSearch) {
  onStateChange(prop, () => {
    if (prop !== 'searchPage') {
      state.searchPage = 1;
    }
    state.searchScrollPosition = 0;

    refreshSearchResults().catch(console.error);
  });
}

async function customFetch(input: Request, init?: RequestInit): Promise<Response> {
  state.loadingCount++;
  try {
    let response = await globalThis.fetch(input, init);
    if (response.status === 403) {
      // Try refreshing the token and repeating the request
      // This can fix the situation where the access level of
      // the user has been changed and requires a new token
      try {
        const localClient = createClient<paths>({
          baseUrl: `${globalThis.location.origin}/api/v1`
        });
        const { data: user, error } = await localClient.GET('/auth');
        if (error || !user) {
          throw new Error('Failed to refresh token');
        }
        state.currentUser = user.user;
        response = await globalThis.fetch(input, init);
      } catch (retryError) {
        // Just log this; let the original error propagate
        console.error(retryError);
      }
    }
    return response;
  } finally {
    if (state.loadingCount > 0) {
      state.loadingCount--;
    }
  }
};

export const apiClient = createClient<paths>({
  baseUrl: `${globalThis.location.origin}/api/v1`,
  fetch: customFetch
});

export async function loadUserSettings(): Promise<UserSettings | null> {
  try {
    const { data: settings, error } = await apiClient.GET('/users/current/settings');
    if (error || !settings) {
      throw new Error('Failed to load user settings');
    }
    return settings;
  } catch (ex) {
    console.error(ex);
    return null;
  }
}

export async function loadSearchFilters(): Promise<SavedSearchFilterCompact[]> {
  try {
    const { data: filters, error } = await apiClient.GET('/users/current/filters');
    if (error || !filters) {
      throw new Error('Failed to load search filters');
    }
    return filters;
  } catch (ex) {
    console.error(ex);
    return [];
  }
}

export async function performRecipeSearch(filter: SearchFilter, page: number, count: number) {
  // Make sure to fill in any missing fields
  const defaultFilter = getDefaultSearchFilter();
  filter = { ...defaultFilter, ...filter };

  const { data: recipes, error } = await apiClient.GET('/recipes', {
    params: {
      query: {
        sort: filter.sortBy,
        dir: filter.sortDir,
        page: page,
        count: count,
        q: filter.query,
        pictures: toYesNoAny(filter.withPictures),
        fields: filter.fields.length > 0 ? filter.fields : undefined,
        states: filter.states.length > 0 ? filter.states : undefined,
        tags: filter.tags.length > 0 ? filter.tags : undefined
      }
    }
  });

  if (error || !recipes) {
    throw new Error('Failed to perform recipe search');
  }
  return recipes;
}

export async function refreshSearchResults() {
  if (isNull(state.currentUser)) return;

  try {
    const { total, recipes } = await performRecipeSearch(state.searchFilter, state.searchPage, state.searchResultsPerPage);
    state.searchResults = recipes ?? [];
    state.searchResultCount = total;
    state.searchNumPages = Math.max(Math.ceil(total / state.searchResultsPerPage), 1);
  } catch (ex) {
    console.error(ex);
    state.searchResults = [];
    state.searchResultCount = undefined;
    state.searchNumPages = 1;
  } finally {
    if (state.searchPage > state.searchNumPages) {
      state.searchPage = state.searchNumPages;
    }
  }

  // Also populate total recipe count
  try {
    const { data: results, error } = await apiClient.GET('/recipes', { params: { query: { count: 0, } } });

    if (error || !results) {
      throw new Error('Failed to fetch total recipe count');
    }

    state.totalRecipeCount = results.total;
  } catch (ex) {
    console.error(ex);
    state.totalRecipeCount = undefined;
  }
}
