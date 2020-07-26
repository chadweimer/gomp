export interface Search {
    query: string;
    fields: string[];
    tags: string[];
    pictures: string[];
    states: string[];
}

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

export interface SearchFilter {
    query: string;
    fields: SearchField[];
    pictures: SearchPictures;
    states: SearchState;
    tags: string[]
}

export interface User {
    id: number;
    username: string;
    accessLevel: string;
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

export interface EventWithModel<T = any> extends Event {
    model: T;
}
