import { createStore } from '@stencil/store';
import { RecipeCompact, SearchFilter, User, UserSettings } from '../generated';
import { recipesApi } from '../helpers/api';
import { toYesNoAny } from '../helpers/utils';
import { getDefaultSearchFilter, getDefaultSearchSettings, SearchSettings, SearchViewMode } from '../models';

interface AppState {
  jwtToken?: string;
  currentUser?: User;
  currentUserSettings?: UserSettings;
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
  if (val) {
    set(prop.key, prop.isObject ? JSON.parse(val) : val);
  }
  onChange(prop.key, val => val ? prop.storage.setItem(prop.key, prop.isObject ? JSON.stringify(val) : <string>val) : prop.storage.removeItem(prop.key));
}

// Sync certain properties from browser storage
const propsToSearch: (keyof AppState)[] = ['searchSettings', 'searchFilter', 'searchPage'];
for (const prop of propsToSearch) {
  onChange(prop, async () => await performSearch());
}

async function performSearch(resetPageState = true) {
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
    state.searchNumPages = Math.ceil(total / count);
  } catch (ex) {
    console.error(ex);
    state.searchResults = [];
    state.searchResultCount = null;
    state.searchNumPages = 1;
  } finally {
    if (resetPageState || state.searchPage > state.searchNumPages) {
      state.searchPage = 1;
      state.searchScrollPosition = 0;
    }
  }
}

export { state as default, reset as clearState, performSearch };
