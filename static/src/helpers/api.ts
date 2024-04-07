import { AppApi, Configuration, FetchParams, Middleware, RecipesApi, SearchFilter, UsersApi } from '../generated';
import { SearchViewMode, getDefaultSearchFilter } from '../models';
import state, { onStateChange } from '../stores/state';
import { isNullOrEmpty, toYesNoAny } from './utils';

// Retrieve search results when search filters change
const propsToSearch: (keyof typeof state)[] = ['searchSettings', 'searchFilter', 'searchPage'];
for (const prop of propsToSearch) {
  onStateChange(prop, async () => {
    if (prop !== 'searchPage') {
      state.searchPage = 1;
    }
    state.searchScrollPosition = 0;

    await refreshSearchResults();
  });
}

class LoadingMiddleware implements Middleware {
  pre(): Promise<void | FetchParams> {
    state.loadingCount++;
    return Promise.resolve();
  }

  post(): Promise<void | Response> {
    if (state.loadingCount > 0) {
      state.loadingCount--;
    }
    return Promise.resolve();
  }

  onError(): Promise<void | Response> {
    return this.post();
  }
}

const configuration = new Configuration({
  basePath: `${window.location.origin}/api/v1`,
  accessToken: () => state.jwtToken,
  middleware: [new LoadingMiddleware()]
});

export const appApi = new AppApi(configuration);
export const recipesApi = new RecipesApi(configuration);
export const usersApi = new UsersApi(configuration);

export async function loadUserSettings() {
  try {
    return await usersApi.getSettings();
  } catch (ex) {
    console.error(ex);
    return null
  }
}

export async function loadSearchFilters() {
  try {
    return await usersApi.getSearchFilters();
  } catch (ex) {
    console.error(ex);
    return [];
  }
}

export async function performRecipeSearch(filter: SearchFilter, page: number, count: number) {
  return recipesApi.find({
    sort: filter.sortBy,
    dir: filter.sortDir,
    page: page,
    count: count,
    q: filter.query,
    pictures: toYesNoAny(filter.withPictures),
    fields: filter.fields.length > 0 ? filter.fields : null,
    states: filter.states.length > 0 ? filter.states : null,
    tags: filter.tags.length > 0 ? filter.tags : null
  });
}

export async function refreshSearchResults() {
  if (isNullOrEmpty(state.jwtToken)) return;

  // Make sure to fill in any missing fields
  const defaultFilter = getDefaultSearchFilter();
  const filter = { ...defaultFilter, ...state.searchFilter };

  const count = state.searchSettings.viewMode === SearchViewMode.Card ? 24 : 60;

  try {
    const { total, recipes } = await performRecipeSearch(filter, state.searchPage, count);
    state.searchResults = recipes ?? [];
    state.searchResultCount = total;
    state.searchNumPages = Math.max(Math.ceil(total / count), 1);
  } catch (ex) {
    console.error(ex);
    state.searchResults = [];
    state.searchResultCount = null;
    state.searchNumPages = 1;
  } finally {
    if (state.searchPage > state.searchNumPages) {
      state.searchPage = state.searchNumPages;
    }
  }
}
