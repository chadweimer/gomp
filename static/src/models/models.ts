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

    public ToSearchFilter(existingFilter: SavedSearchFilter = null): SavedSearchFilter {
        let withPictures: boolean|null = null;
        switch (this.pictures) {
            case SearchPictures.Yes:
                withPictures = true;
                break;
            case SearchPictures.No:
                withPictures = false;
                break;
        }

        const states: string[] = [];
        switch (this.states) {
            case SearchState.Active:
            case SearchState.Archived:
                states.push(this.states);
                break;
            case SearchState.Any:
                states.push(SearchState.Active);
                states.push(SearchState.Archived);
                break;
        }

        return {
            id: existingFilter?.id,
            userId: existingFilter?.userId,
            name: existingFilter?.name,
            withPictures: withPictures,
            query: this.query,
            fields: this.fields,
            states: states,
            tags: this.tags,
            sortBy: this.sortBy,
            sortDir: this.sortDir
        };
    }

    public FromSearchFilter(filter: SavedSearchFilter): SearchFilterParameters {
        this.query = filter.query;
        this.sortBy = filter.sortBy;
        this.sortDir = filter.sortDir;
        this.fields = filter.fields?.map(f => SearchField[f]) ?? [];
        this.tags = filter.tags ?? [];

        switch (filter.withPictures) {
            case true:
                this.pictures = SearchPictures.Yes;
                break;
            case false:
                this.pictures = SearchPictures.No;
                break;
            default:
                this.pictures = SearchPictures.Any;
                break;
        }

        if (filter.states === null || filter.states.length == 0) {
            this.states = SearchState.Active;
        } else if (filter.states.indexOf(SearchState.Active) >= 0) {
            if (filter.states.indexOf(SearchState.Archived) >= 0) {
                this.states = SearchState.Any;
            } else {
                this.states = SearchState.Active;
            }
        } else if (filter.states.indexOf(SearchState.Archived) >= 0) {
            this.states = SearchState.Archived;
        }

        return this;
    }
}

export interface SavedSearchFilterCompact {
    id: number;
    userId: number;
    name: string;
}

export interface SavedSearchFilter extends SavedSearchFilterCompact {
    query: string;
    withPictures: boolean|null;
    fields: string[];
    states: string[];
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
