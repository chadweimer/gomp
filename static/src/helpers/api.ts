import { AppApi, Configuration, RecipesApi, SearchFilter, UsersApi } from '../generated';
import state from '../stores/state';
import { toYesNoAny } from './utils';

const configuration = new Configuration({
  basePath: `${window.location.origin}/api/v1`,
  accessToken: () => state.jwtToken
});

export const appApi = new AppApi(configuration);
export const recipesApi = new RecipesApi(configuration);
export const usersApi = new UsersApi(configuration);

export async function loadUserSettings() {
  try {
    return (await usersApi.getSettings());
  } catch (ex) {
    console.error(ex);
    return null
  }
}

export async function loadSearchFilters() {
  try {
    return (await usersApi.getSearchFilters());
  } catch (ex) {
    console.error(ex);
    return [];
  }
}

export async function performRecipeSearch(filter: SearchFilter, page: number, count: number) {
  return recipesApi.find({
    sort: filter.sortBy,
    dir: filter.sortDir,
    page: page,
    count: count,
    q: filter.query,
    pictures: toYesNoAny(filter.withPictures),
    fields: filter.fields.length > 0 ? filter.fields : null,
    states: filter.states.length > 0 ? filter.states : null,
    tags: filter.tags.length > 0 ? filter.tags : null
  });
}

export function getLocationFromResponse(headers: Headers) {
  return headers.get('location') ?? '';
}
