import { createContext } from '@lit/context';
import { RecipeCompact, SearchFilter } from '../helpers/schema.gen';
import { SearchSettings } from '../models';

export interface SearchContextValue {
  filter: SearchFilter;
  settings: SearchSettings;
  page: number;
  numPages: number;
  resultsPerPage: 24 | 36 | 60 | 96 | 120;
  results?: RecipeCompact[];
  resultCount?: number;
  scrollPosition?: number;
  setFilter(filter: SearchFilter): void;
  setSettings(settings: SearchSettings): void;
  setPage(page: number): void;
  setResultsPerPage(count: 24 | 36 | 60 | 96 | 120): void;
  setScrollPosition(pos?: number): void;
  refresh(): Promise<void>;
  reset(): void;
}

export const searchContext = createContext<SearchContextValue>('searchContext');
