import createClient, { Client } from 'openapi-fetch';
import { paths, SavedSearchFilterCompact, SearchFilter, SearchResult, UserSettings } from './schema.gen';
import { getDefaultSearchFilter } from '../models';
import state, { onStateChange } from '../stores/state';
import { isNull, toYesNoAny } from './utils';
import { Subject } from 'rxjs';

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

class Api {
  readonly client: Client<paths, `${string}/${string}`>;
  readonly responses: Subject<{ request: Request, response: Response }>;

  constructor() {
    this.client = createClient<paths>({
      baseUrl: `${globalThis.location.origin}/api/v1`,
      fetch: this.fetch
    });
    this.responses = new Subject<{ request: Request, response: Response }>();
  }

  private readonly fetch = async (input: Request, init?: RequestInit): Promise<Response> => {
    state.loadingCount++;
    try {
      let response = await globalThis.fetch(input, init);
      if (response.status === 403) {
        // Try refreshing the token and repeating the request
        // This can fix the situation where the access level of
        // the user has been changed and requires a new token
        try {
          const refreshClient = createClient<paths>({
            baseUrl: `${globalThis.location.origin}/api/v1`
          });
          const { data: user, error } = await refreshClient.GET('/auth');
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
      this.responses.next({ request: input, response });
      return response;
    } finally {
      if (state.loadingCount > 0) {
        state.loadingCount--;
      }
    }
  }

  readonly loadUserSettings = async (): Promise<UserSettings | null> => {
    const { data: settings, error } = await api.client.GET('/users/current/settings');

    if (error) {
      throw new Error('Failed to load user settings.', { cause: error });
    }

    return settings ?? null;
  }

  readonly loadSearchFilters = async (): Promise<SavedSearchFilterCompact[]> => {
    const { data: filters, error } = await api.client.GET('/users/current/filters');

    if (error) {
      throw new Error('Failed to load search filters.', { cause: error });
    }

    return filters ?? [];
  }

  readonly performRecipeSearch = async (filter: SearchFilter, page: number, count: number): Promise<SearchResult> => {
    // Make sure to fill in any missing fields
    const defaultFilter = getDefaultSearchFilter();
    filter = { ...defaultFilter, ...filter };

    const { data: recipes, error } = await api.client.GET('/recipes', {
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
}

export const api = new Api();

export async function refreshSearchResults() {
  if (isNull(state.currentUser)) return;

  try {
    const { total, recipes } = await api.performRecipeSearch(state.searchFilter, state.searchPage, state.searchResultsPerPage);
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
    const { data: results, error } = await api.client.GET('/recipes', { params: { query: { count: 0, } } });

    if (error) {
      throw new Error('Failed to fetch total recipe count.', { cause: error });
    }

    state.totalRecipeCount = results.total;
  } catch (ex) {
    console.error(ex);
    state.totalRecipeCount = undefined;
  }
}

export function fileContentSerializer(_body: { file_content?: string } | undefined, file: File) {
  // The unused _body parameter is required to match the expected signature for bodySerializer,
  // so that we know we're using the right part name in the form data

  const fd = new FormData();
  fd.append('file_content', file);
  return fd;
}
