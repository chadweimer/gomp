import { AppApi, Configuration, ImagesApi, LinksApi, NotesApi, RecipesApi, UsersApi } from '../generated';
import state from '../stores/state';

const configuration = new Configuration({
  basePath: `${window.location.origin}/api/v1`,
  apiKey: name => name === 'Authorization' && state.jwtToken ? `Bearer ${state.jwtToken}` : ''
});

export const appApi = new AppApi(configuration);
export const imagesApi = new ImagesApi(configuration);
export const linksApi = new LinksApi(configuration);
export const notesApi = new NotesApi(configuration);
export const recipesApi = new RecipesApi(configuration);
export const usersApi = new UsersApi(configuration);

export function getLocationFromResponse(headers: Headers) {
  return headers.get('Location') ?? '';
}
