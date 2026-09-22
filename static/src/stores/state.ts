import { createStore } from '@stencil/store';
import { RecipeCompact, RecipeState, SearchField, SearchFilter, SortBy, SortDir, User } from '../api/schema.gen';
import { isNull } from '../helpers/utils';
import { SearchSettings, SearchViewMode } from '../models';

interface AppState {
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
}

export function getDefaultSearchFilter(): SearchFilter {
  return {
    query: '',
    withPictures: null,
    fields: [SearchField.Name, SearchField.Ingredients, SearchField.Directions],
    states: [RecipeState.Active],
    tags: [],
    sortBy: SortBy.Name,
    sortDir: SortDir.Asc
  };
}

export function getDefaultSearchSettings(): SearchSettings {
  return {
    viewMode: SearchViewMode.Card
  };
}

// Start with an empty state
// eslint-disable-next-line @typescript-eslint/unbound-method
const { state, set, onChange, reset } = createStore<AppState>({
  searchFilter: getDefaultSearchFilter(),
  searchSettings: getDefaultSearchSettings(),
  searchPage: 1,
  searchNumPages: 1,
  searchResultsPerPage: 36,
  loadingCount: 0
});

// Sync certain properties from browser storage
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
      const parsedVal = JSON.parse(val) as number | SearchFilter | SearchSettings | RecipeCompact[] | User | undefined;
      set(prop.key, parsedVal);
    } catch (e) {
      prop.storage.removeItem(prop.key);
      console.warn(`Failed to parse stored value for ${prop.key}: ${val}`, e);
      continue;
    }
  }
  onChange(prop.key, val => {
    if (isNull(val)) {
      prop.storage.removeItem(prop.key);
    } else {
      prop.storage.setItem(prop.key, JSON.stringify(val));
    }
  });
}

export default state;
export { reset as clearState, onChange as onStateChange };
