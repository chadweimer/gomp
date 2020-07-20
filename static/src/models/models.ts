export interface Search {
    query: string;
    fields: string[];
    tags: string[];
    pictures: string[];
}

export interface User {
    id: number;
    username: string;
    accessLevel: string;
}

interface RecipeBase {
	id: number;
	name: string;
	servingSize: string;
	nutritionInfo: string;
	ingredients: string;
	directions: string;
	sourceUrl: string;
	createdAt: string;
	modifiedAt: string;
	averageRating: number;
}

export interface Recipe extends RecipeBase {
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
