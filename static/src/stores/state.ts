import { createStore } from '@stencil/store';
import { RecipeCompact, SearchFilter } from '../generated';
import { recipesApi } from '../helpers/api';
import { isNull, isNullOrEmpty, toYesNoAny } from '../helpers/utils';
import { getDefaultSearchFilter, getDefaultSearchSettings, SearchSettings, SearchViewMode } from '../models';

interface AppState {
  jwtToken?: string;
  searchFilter: SearchFilter;
  searchSettings: SearchSettings;
  searchPage: number;
  searchNumPages: number;
  searchResults?: RecipeCompact[];
  searchResultCount?: number;
  searchScrollPosition?: number;
}

// Start with an empty state
const { state, set, onChange, reset } = createStore<AppState>({
  searchFilter: getDefaultSearchFilter(),
  searchSettings: getDefaultSearchSettings(),
  searchPage: 1,
  searchNumPages: 1
});

// Sync certain properties from browser storage
const propsToSync: { storage: Storage, key: keyof AppState, isObject: boolean }[] = [
  { storage: localStorage, key: 'jwtToken', isObject: false },
  { storage: sessionStorage, key: 'searchFilter', isObject: true },
  { storage: sessionStorage, key: 'searchSettings', isObject: true },
  { storage: sessionStorage, key: 'searchPage', isObject: true }
];
for (const prop of propsToSync) {
  const val = prop.storage.getItem(prop.key);
  if (!isNull(val)) {
    set(prop.key, prop.isObject ? JSON.parse(val) : val);
  }
  onChange(prop.key, val => {
    if (!isNull(val)) {
      prop.storage.setItem(prop.key, prop.isObject ? JSON.stringify(val) : <string>val);
    } else {
      prop.storage.removeItem(prop.key);
    }
  });
}

// Retrieve search results when search filters change
const propsToSearch: (keyof AppState)[] = ['searchSettings', 'searchFilter', 'searchPage'];
for (const prop of propsToSearch) {
  onChange(prop, async () => {
    if (prop !== 'searchPage') {
      state.searchPage = 1;
    }
    state.searchScrollPosition = 0;

    await refreshSearchResults();
  });
}

async function refreshSearchResults() {
  if (isNullOrEmpty(state.jwtToken)) return;

  // Make sure to fill in any missing fields
  const defaultFilter = getDefaultSearchFilter();
  const filter = { ...defaultFilter, ...state.searchFilter };

  const count = state.searchSettings.viewMode === SearchViewMode.Card ? 24 : 60;

  try {
    const { data: { total, recipes } } = await recipesApi.find(
      filter.sortBy,
      filter.sortDir,
      state.searchPage,
      count,
      filter.query,
      toYesNoAny(filter.withPictures),
      filter.fields,
      filter.states,
      filter.tags);
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

export { state as default, reset as clearState, refreshSearchResults };
