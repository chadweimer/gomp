import { AxiosResponseHeaders } from 'axios';
import { AppApi, Configuration, RecipesApi, UsersApi } from '../generated';
import state from '../stores/state';

const configuration = new Configuration({
  basePath: `${window.location.origin}/api/v1`,
  accessToken: () => state.jwtToken
});

export const appApi = new AppApi(configuration);
export const recipesApi = new RecipesApi(configuration);
export const usersApi = new UsersApi(configuration);

export async function loadUserSettings() {
  try {
    return (await usersApi.getSettings()).data;
  } catch (ex) {
    console.error(ex);
    return null
  }
}

export async function loadSearchFilters() {
  try {
    return (await usersApi.getSearchFilters()).data;
  } catch (ex) {
    console.error(ex);
    return [];
  }
}

export function getLocationFromResponse(headers: AxiosResponseHeaders) {
  return headers['location'] ?? '';
}
