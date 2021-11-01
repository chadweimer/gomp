import { AppApi, Configuration, RecipesApi, UsersApi } from '../generated';
import state from '../stores/state';

const configuration = new Configuration({
  basePath: `${window.location.origin}/api/v1`,
  accessToken: () => state.jwtToken
});

export const appApi = new AppApi(configuration);
export const recipesApi = new RecipesApi(configuration);
export const usersApi = new UsersApi(configuration);

export function getLocationFromResponse(headers: Headers) {
  return headers.get('Location') ?? '';
}
