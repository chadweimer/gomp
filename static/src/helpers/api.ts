import createClient from 'openapi-fetch';
import { paths, SearchFilter, SearchResult } from '../api/schema.gen';
import { getDefaultSearchFilter } from '../models';
import state, { onStateChange } from '../stores/state';
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
        if (error) {
          throw new Error('Failed to refresh token.', { cause: error });
        }
        state.currentUser = user;
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

export async function loadUserSettings() {
  try {
    const { data: settings, error } = await apiClient.GET('/users/current/settings');

    if (error) {
      throw new Error('Failed to load user settings.', { cause: error });
    }

    return settings ?? null;
  } catch (ex) {
    console.error(ex);
    return null;
  }
}

export async function loadSearchFilters() {
  try {
    const { data: filters, error } = await apiClient.GET('/users/current/filters');

    if (error) {
      throw new Error('Failed to load search filters.', { cause: error });
    }

    return filters ?? [];
  } catch (ex) {
    console.error(ex);
    return [];
  }
}

export async function performRecipeSearch(filter: SearchFilter, page: number, count: number): Promise<SearchResult> {
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

  if (error) {
    throw new Error('Failed to perform recipe search.', { cause: error });
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

    if (error) {
      throw new Error('Failed to fetch total recipe count.', { cause: error });
    }

    state.totalRecipeCount = results.total;
  } catch (ex) {
    console.error(ex);
    state.totalRecipeCount = undefined;
  }
}
export function fileContentSerializer(body?: { file_content?: string }) {
  const fd = new FormData();
  if (body) {
    Object.entries(body).forEach(([key, value]) => fd.append(key, value));
  }
  return fd;
}
