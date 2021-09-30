import { AppConfiguration, AppInfo, Note, Recipe, RecipeCompact, RecipeImage, RecipeState, SearchFilter, User, UserSettings } from '../models';
import { ajaxDelete, ajaxGet, ajaxPost, ajaxPostWithLocation, ajaxPostWithResult, ajaxPut } from './ajax';

export class AuthApi {
  static async authenticate(target: EventTarget, username: string, password: string) {
    const authDetails = {
      username,
      password
    };
    const response: { token: string } = await ajaxPostWithResult(target, '/api/v1/auth', authDetails);
    return response.token;
  }
}

export class AppApi {
  static async getInfo(target: EventTarget): Promise<AppInfo> {
    return await ajaxGet(target, '/api/v1/app/info');
  }

  static async getConfiguration(target: EventTarget): Promise<AppConfiguration> {
    return await ajaxGet(target, '/api/v1/app/configuration');
  }

  static async putConfiguration(target: EventTarget, appConfig: AppConfiguration) {
    await ajaxPut(target, '/api/v1/app/configuration', appConfig);
  }
}

export class UsersApi {
  static async getAll(target: EventTarget): Promise<User[]> {
    return await ajaxGet(target, '/api/v1/users') ?? [];
  }

  static async get(target: EventTarget, id: number | null = null): Promise<User> {
    return await ajaxGet(target, `/api/v1/users/${id !== null ? id : 'current'}`);
  }

  static async getSettings(target: EventTarget, id: number | null = null): Promise<UserSettings> {
    return await ajaxGet(target, `/api/v1/users/${id !== null ? id : 'current'}/settings`);
  }

  static async post(target: EventTarget, user: User, password: string) {
    await ajaxPost(target, '/api/v1/users', {
      ...user,
      password: password
    });
  }

  static async put(target: EventTarget, user: User) {
    await ajaxPut(target, `/api/v1/users/${user.id}`, user);
  }

  static async delete(target: EventTarget, id: number) {
    await ajaxDelete(target, `/api/v1/users/${id}`);
  }
}

export class RecipesApi {
  static async get(target: EventTarget, id: number): Promise<{ recipe: Recipe, mainImage: RecipeImage }> {
    const recipe = await ajaxGet<Recipe>(target, `/api/v1/recipes/${id}`);
    const mainImage = await ajaxGet<RecipeImage>(target, `/api/v1/recipes/${id}/image`);

    return { recipe, mainImage };
  }

  static async getImages(target: EventTarget, recipeId: number): Promise<RecipeImage[]> {
    return await ajaxGet(target, `/api/v1/recipes/${recipeId}/images`) ?? [];
  }

  static async getNotes(target: EventTarget, recipeId: number): Promise<Note[]> {
    return await ajaxGet(target, `/api/v1/recipes/${recipeId}/notes`) ?? [];
  }

  static async find(target: EventTarget, filter: SearchFilter, page: number, count: number): Promise<{ total: number, recipes: RecipeCompact[] }> {
    const filterQuery = {
      'q': filter.query,
      'pictures': filter.withPictures,
      'fields[]': filter.fields,
      'tags[]': filter.tags,
      'states[]': filter.states,
      'sort': filter.sortBy,
      'dir': filter.sortDir,
      'page': page,
      'count': count
    };
    return await ajaxGet(target, '/api/v1/recipes', filterQuery) ?? { total: 0, recipes: [] };
  }

  static async post(target: EventTarget, recipe: Recipe): Promise<number> {
    const location = await ajaxPostWithLocation(target, '/api/v1/recipes', recipe);

    const temp = document.createElement('a');
    temp.href = location;
    const path = temp.pathname;

    const newRecipeIdMatch = path.match(/\/api\/v1\/recipes\/(\d+)/);
    if (newRecipeIdMatch) {
      return parseInt(newRecipeIdMatch[1], 10);
    } else {
      throw new Error(`Unexpected path: ${path}`);
    }
  }

  static async postImage(target: EventTarget, recipeId: number, formData: FormData) {
    await ajaxPost(target, `/api/v1/recipes/${recipeId}/images`, formData);
  }

  static async put(target: EventTarget, recipe: Recipe) {
    await ajaxPut(target, `/api/v1/recipes/${recipe.id}`, recipe);
  }

  static async putState(target: EventTarget, recipeId: number, state: RecipeState) {
    await ajaxPut(target, `/api/v1/recipes/${recipeId}/state`, state);
  }

  static async delete(target: EventTarget, id: number) {
    await ajaxDelete(target, `/api/v1/recipes/${id}`);
  }
}

export class NotesApi {
  static async post(target: EventTarget, note: Note) {
    await ajaxPost(target, '/api/v1/notes', note);
  }

  static async put(target: EventTarget, note: Note) {
    await ajaxPut(target, `/api/v1/notes/${note.id}`, note);
  }

  static async delete(target: EventTarget, id: number) {
    await ajaxDelete(target, `/api/v1/notes/${id}`);
  }
}
