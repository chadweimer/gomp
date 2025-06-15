import { RecipeState, SearchField, SearchFilter, SortBy, SortDir } from './generated';

export const SearchViewMode = {
  Card: 'card',
  List: 'list'
} as const;
export type SearchViewMode = typeof SearchViewMode[keyof typeof SearchViewMode];

export const SwipeDirection = {
  Left: 'left',
  Right: 'right'
} as const;
export type SwipeDirection = typeof SwipeDirection[keyof typeof SwipeDirection];

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

export interface SearchSettings {
  viewMode: SearchViewMode;
}
