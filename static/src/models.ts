import { RecipeState, SearchField, SearchFilter, SortBy, SortDir } from './generated';

export enum YesNoAny {
  Yes = 'yes',
  No = 'no',
  Any = 'any'
}

export enum SearchViewMode {
  Card = 'card',
  List = 'list'
}

export enum SwipeDirection {
  Left = 'left',
  Right = 'right'
}

export class DefaultSearchFilter implements SearchFilter {
  constructor() {
    this.query = '';
    this.fields = [SearchField.Name, SearchField.Ingredients, SearchField.Directions];
    this.states = [RecipeState.Active];
    this.tags = [];
    this.sortBy = SortBy.Name;
    this.sortDir = SortDir.Asc;
  }

  query: string;
  withPictures?: boolean | null;
  fields: SearchField[];
  states: RecipeState[];
  tags: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

export class DefaultSearchSettings implements SearchSettings {
  constructor() {
    this.viewMode = SearchViewMode.Card;
  }
  viewMode: SearchViewMode;
}

export interface SearchSettings {
  viewMode: SearchViewMode;
}
