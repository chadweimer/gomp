import { createContext } from '@lit/context';

export interface AppStatusContextValue {
  loadingCount: number;
  totalRecipeCount?: number;
  totalTagsCount?: number;
  setTotalRecipeCount(count: number): void;
  setTotalTagsCount(count: number): void;
}

export const appStatusContext = createContext<AppStatusContextValue>('appStatusContext');
