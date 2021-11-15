import { createStore } from '@stencil/store';
import { SearchFilter, User, UserSettings } from '../generated';
import { getDefaultSearchFilter, getDefaultSearchSettings, SearchSettings } from '../models';

interface AppState {
  jwtToken?: string;
  currentUser?: User;
  currentUserSettings?: UserSettings;
  searchFilter: SearchFilter;
  searchSettings: SearchSettings;
  searchPage: number;
  searchResultCount?: number;
}

// Start with an empty state
const { state, set, onChange, reset } = createStore<AppState>({
  searchFilter: getDefaultSearchFilter(),
  searchSettings: getDefaultSearchSettings(),
  searchPage: 1
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

export { state as default, reset as clearState };
