export enum SearchField {
  Name = 'name',
  Ingredients = 'ingredients',
  Directions = 'directions'
}

export enum RecipeState {
  Active = 'active',
  Archived = 'archived',
}

export enum YesNoAny {
  Yes = 'yes',
  No = 'no',
  Any = 'any'
}

export enum SortBy {
  Name = 'name',
  Rating = 'rating',
  Created = 'created',
  Modified = 'modified',
  Random = 'random'
}

export enum SortDir {
  Asc = 'asc',
  Desc = 'desc'
}

export enum AccessLevel {
  Administrator = 'admin',
  Editor = 'editor',
  Viewer = 'viewer'
}

export enum SearchViewMode {
  Card = 'card',
  List = 'list'
}

export class DefaultSearchFilter implements SearchFilter {
  constructor() {
    this.query = '';
    this.withPictures = null;
    this.fields = [SearchField.Name, SearchField.Ingredients, SearchField.Directions];
    this.states = [RecipeState.Active];
    this.tags = [];
    this.sortBy = SortBy.Name;
    this.sortDir = SortDir.Asc;
  }

  query: string;
  withPictures: boolean | null;
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

export interface SavedSearchFilterCompact {
  id?: number;
  userId: number;
  name: string;
}

export interface SearchFilter {
  query: string;
  withPictures: boolean | null;
  fields: SearchField[];
  states: RecipeState[];
  tags: string[];
  sortBy: SortBy;
  sortDir: SortDir;
}

export interface SavedSearchFilter extends SavedSearchFilterCompact, SearchFilter {
}

export interface SearchSettings {
  viewMode: SearchViewMode;
}

export interface AppInfo {
  version: string;
}

export interface AppConfiguration {
  title: string;
}

export interface User {
  id?: number;
  username: string;
  accessLevel: string;
}

export interface UserSettings {
  userId: string;
  homeTitle: string;
  homeImageUrl: string;
  favoriteTags: string[];
}

interface RecipeBase {
  id?: number;
  name: string;
  state?: string;
  createdAt?: string;
  modifiedAt?: string;
  averageRating?: number;
}

export interface Recipe extends RecipeBase {
  servingSize?: string;
  nutritionInfo?: string;
  ingredients?: string;
  directions?: string;
  storageInstructions?: string;
  sourceUrl?: string;
  tags: string[];
}

export interface RecipeCompact extends RecipeBase {
  thumbnailUrl: string;
}

export interface Note {
  id?: number;
  recipeId?: number;
  text: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface RecipeImage {
  id?: number;
  recipeId: number;
  name: string;
  url: string;
  thumbnailUrl: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface EventWithModel<T = any> extends Event {
  model: T;
}

export interface EventWithTarget<T extends EventTarget> extends Event {
  target: T;
}
