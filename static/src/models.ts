import { RecipeState, SearchField, SearchFilter, SortBy, SortDir } from './generated';

export enum SearchViewMode {
  Card = 'card',
  List = 'list'
}

export enum SwipeDirection {
  Left = 'left',
  Right = 'right'
}

export function getDefaultSearchFilter(): SearchFilter {
  return {
    query: '',
    withPictures: undefined,
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
