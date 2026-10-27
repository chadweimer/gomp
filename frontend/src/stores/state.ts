import { RecipeCompact, SearchFilter, User } from '../helpers/schema.gen';
import { isNull } from '../helpers/utils';
import { getDefaultSearchFilter, getDefaultSearchSettings, SearchSettings } from '../models';
import { createStore } from './store';

export interface AppState {
  currentUser?: User;
  searchFilter: SearchFilter;
  searchSettings: SearchSettings;
  searchPage: number;
  searchNumPages: number;
  searchResultsPerPage: 24 | 36 | 60 | 96 | 120;
  searchResults?: RecipeCompact[];
  searchResultCount?: number;
  searchScrollPosition?: number;
  loadingCount: number;
  totalRecipeCount?: number;
  totalTagsCount?: number;
}

export const appStateStore = createStore<AppState>({
  searchFilter: getDefaultSearchFilter(),
  searchSettings: getDefaultSearchSettings(),
  searchPage: 1,
  searchNumPages: 1,
  searchResultsPerPage: 36,
  loadingCount: 0
});

const { state, set, onChange, reset } = appStateStore;

// Sync certain properties from browser storage
if (typeof window !== 'undefined') {
  const propsToSync: { storage: Storage, key: keyof AppState }[] = [
    { storage: localStorage, key: 'currentUser' },
    { storage: sessionStorage, key: 'searchFilter' },
    { storage: sessionStorage, key: 'searchSettings' },
    { storage: sessionStorage, key: 'searchPage' },
    { storage: sessionStorage, key: 'searchResultsPerPage' }
  ];

  for (const prop of propsToSync) {
    const val = prop.storage.getItem(prop.key);
    if (!isNull(val)) {
      try {
        const parsedVal = JSON.parse(val) as any;
        set(prop.key, parsedVal);
      } catch (e) {
        prop.storage.removeItem(prop.key);
        console.warn(`Failed to parse stored value for ${prop.key}: ${val}`, e);
        continue;
      }
    }
    onChange(prop.key, (val: any) => {
      if (isNull(val)) {
        prop.storage.removeItem(prop.key);
      } else {
        prop.storage.setItem(prop.key, JSON.stringify(val));
      }
    });
  }
}

export default state;
export { reset as clearState, onChange as onStateChange };

