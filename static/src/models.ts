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

export interface SearchSettings {
  viewMode: SearchViewMode;
}
