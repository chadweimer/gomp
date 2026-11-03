import createClient, { Client } from 'openapi-fetch';
import { paths, SavedSearchFilterCompact, SearchFilter, SearchResult, UserSettings } from './schema.gen';
import { getDefaultSearchFilter } from '../models';
import { toYesNoAny } from './utils';
import { BehaviorSubject, Subject } from 'rxjs';

class Api {
  readonly client: Client<paths, `${string}/${string}`>;
  readonly responses: Subject<{ request: Request, response: Response }>;
  readonly loading$: BehaviorSubject<number>;
  private activeRequests = 0;

  constructor() {
    this.client = createClient<paths>({
      baseUrl: `${globalThis.location.origin}/api/v1`,
      fetch: this.fetch
    });
    this.responses = new Subject<{ request: Request, response: Response }>();
    this.loading$ = new BehaviorSubject<number>(0);
  }

  private readonly fetch = async (input: Request, init?: RequestInit): Promise<Response> => {
    this.activeRequests++;
    this.loading$.next(this.activeRequests);
    try {
      const response = await globalThis.fetch(input, init);
      this.responses.next({ request: input, response });
      return response;
    } finally {
      if (this.activeRequests > 0) {
        this.activeRequests--;
      }
      this.loading$.next(this.activeRequests);
    }
  };

  readonly loadUserSettings = async (): Promise<UserSettings | null> => {
    const { data: settings, error } = await this.client.GET('/users/current/settings');

    if (error != null) {
      throw new Error('Failed to load user settings.', { cause: error });
    }

    return settings ?? null;
  };

  readonly loadSearchFilters = async (page = 1, count = -1): Promise<SavedSearchFilterCompact[]> => {
    const { data, error } = await this.client.GET('/users/current/filters', {
      params: { query: { page, count } }
    });

    if (error != null) {
      throw new Error('Failed to load search filters.', { cause: error });
    }

    return data?.filters ?? [];
  };

  readonly performRecipeSearch = async (filter: SearchFilter, page: number, count: number): Promise<SearchResult> => {
    // Make sure to fill in any missing fields
    const defaultFilter = getDefaultSearchFilter();
    filter = { ...defaultFilter, ...filter };

    const { data: recipes, error } = await this.client.GET('/recipes', {
      params: {
        query: {
          sort: filter.sortBy,
          dir: filter.sortDir,
          page: page,
          count: count,
          q: filter.query,
          pictures: toYesNoAny(filter.withPictures),
          fields: filter.fields.length > 0 ? filter.fields : undefined,
          states: filter.states.length > 0 ? filter.states : undefined,
          tags: filter.tags.length > 0 ? filter.tags : undefined
        }
      }
    });

    if (error != null) {
      throw new Error('Failed to perform recipe search.', { cause: error });
    }

    return recipes;
  };

  readonly fetchTotalRecipeCount = async (): Promise<number> => {
    const { data: results, error } = await this.client.GET('/recipes', { params: { query: { count: 0 } } });

    if (error != null) {
      throw new Error('Failed to fetch total recipe count.', { cause: error });
    }

    return results.total;
  };

  readonly fetchTotalTagsCount = async (): Promise<number> => {
    const { data: tagResults, error: tagError } = await this.client.GET('/tags', { params: { query: { count: 0 } } });

    if (tagError != null) {
      throw new Error('Failed to fetch total tags count.', { cause: tagError });
    }

    return tagResults.total;
  };
}

export const api = new Api();

export function fileContentSerializer(_body: { file_content?: string } | undefined, file?: File) {
  // The unused _body parameter is required to match the expected signature for bodySerializer,
  // so that we know we're using the right part name in the form data

  const fd = new FormData();
  if (file != null) {
    fd.append('file_content', file);
  }
  return fd;
}
