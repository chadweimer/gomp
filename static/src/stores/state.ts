import { createStore } from '@stencil/store';
import { RecipeCompact, SearchFilter } from '../generated';
import { isNull } from '../helpers/utils';
import { getDefaultSearchFilter, getDefaultSearchSettings, SearchSettings } from '../models';

interface AppState {
  jwtToken?: string;
  searchFilter: SearchFilter;
  searchSettings: SearchSettings;
  searchPage: number;
  searchNumPages: number;
  searchResults?: RecipeCompact[];
  searchResultCount?: number;
  searchScrollPosition?: number;
  loadingCount: number;
  totalRecipeCount?: number;
}

// Start with an empty state
const { state, set, onChange, reset } = createStore<AppState>({
  searchFilter: getDefaultSearchFilter(),
  searchSettings: getDefaultSearchSettings(),
  searchPage: 1,
  searchNumPages: 1,
  loadingCount: 0
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

export { state as default, reset as clearState, onChange as onStateChange };
