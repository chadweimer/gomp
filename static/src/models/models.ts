export enum SearchField {
    Name = 'name',
    Ingredients = 'ingredients',
    Directions = 'directions'
}

export enum SearchState {
    Active = 'active',
    Archived = 'archived',
    Any = 'any'
}

export enum SearchPictures {
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

export class SearchFilterParameters {
    query = '';
    fields: SearchField[] = [];
    pictures = SearchPictures.Any;
    states = SearchState.Active;
    tags: string[] = [];
    sortBy = SortBy.Name;
    sortDir = SortDir.Asc;
}

export interface SavedSearchFilter {
    id: number;
    userId: number;
    name: string;
    query: string;
    withPictures: boolean|null;
    fields: SearchField[];
    states: SearchState[];
    tags: string[];
    sortBy: SortBy;
    sortDir: SortDir;
}

export interface AppConfiguration {
    title: string;
}

export interface User {
    id: number;
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
    id: number;
    name: string;
    state: string;
    createdAt: string;
    modifiedAt: string;
    averageRating: number;
}

export interface Recipe extends RecipeBase {
    servingSize: string;
    nutritionInfo: string;
    ingredients: string;
    directions: string;
    storageInstructions: string;
    sourceUrl: string;
    tags: string[];
}

export interface RecipeCompact extends RecipeBase {
    thumbnailUrl: string;
}

export interface Note {
    id: number;
    recipeId: number;
    text: string;
    createdAt: string;
    modifiedAt: string;
}

export interface RecipeImage {
    id: number;
    recipeId: number;
    name: string;
    url: string;
    thumbnailUrl: string;
    createdAt: string;
    modifiedAt: string;
}

export interface EventWithModel<T = any> extends Event {
    model: T;
}
