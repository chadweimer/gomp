import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { userContext, UserContextValue } from '../context/user-context';
import { searchContext, SearchContextValue } from '../context/search-context';
import { configContext, ConfigContextValue } from '../context/config-context';
import { appStatusContext, AppStatusContextValue } from '../context/app-status-context';
import { getDefaultSearchFilter, getDefaultSearchSettings, SearchSettings } from '../models';
import { AppConfiguration, AppInfo, SearchFilter, User } from '../helpers/schema.gen';
import { vi } from 'vitest';

export function clearTestStorage() {
  if (typeof window !== 'undefined') {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
}

export function createMockUserContext(overrides: Partial<UserContextValue> = {}): UserContextValue {
  const ctx: UserContextValue = {
    user: undefined,
    login: (user: User) => {
      (ctx as { user?: User }).user = user;
    },
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
  return ctx;
}

export function createMockSearchContext(overrides: Partial<SearchContextValue> = {}): SearchContextValue {
  const ctx: SearchContextValue = {
    filter: getDefaultSearchFilter(),
    settings: getDefaultSearchSettings(),
    page: 1,
    numPages: 1,
    resultsPerPage: 36,
    results: [],
    resultCount: 0,
    scrollPosition: 0,
    setFilter: (filter: SearchFilter) => {
      (ctx as { filter: SearchFilter }).filter = filter;
    },
    setSettings: (settings: SearchSettings) => {
      (ctx as { settings: SearchSettings }).settings = settings;
    },
    setPage: (page: number) => {
      (ctx as { page: number }).page = page;
    },
    setResultsPerPage: (count: 24 | 36 | 60 | 96 | 120) => {
      (ctx as { resultsPerPage: 24 | 36 | 60 | 96 | 120 }).resultsPerPage = count;
    },
    setScrollPosition: (pos?: number) => {
      (ctx as { scrollPosition?: number }).scrollPosition = pos;
    },
    refresh: vi.fn().mockResolvedValue(undefined),
    reset: () => {
      (ctx as { filter: SearchFilter }).filter = getDefaultSearchFilter();
      (ctx as { page: number }).page = 1;
      (ctx as { scrollPosition: number }).scrollPosition = 0;
    },
    ...overrides
  };
  return ctx;
}

export function createMockConfigContext(overrides: Partial<ConfigContextValue> = {}): ConfigContextValue {
  const ctx: ConfigContextValue = {
    info: { copyright: 'Copyright © Chad Weimer', version: '1.0.0' },
    config: { title: 'GOMP: Go Meal Planner' },
    setConfig: (config: AppConfiguration) => {
      (ctx as { config: AppConfiguration }).config = config;
    },
    setInfo: (info: AppInfo) => {
      (ctx as { info: AppInfo }).info = info;
    },
    ...overrides
  };
  return ctx;
}

export function createMockAppStatusContext(overrides: Partial<AppStatusContextValue> = {}): AppStatusContextValue {
  const ctx: AppStatusContextValue = {
    loadingCount: 0,
    totalRecipeCount: 0,
    totalTagsCount: 0,
    setTotalRecipeCount: (count: number) => {
      (ctx as { totalRecipeCount: number }).totalRecipeCount = count;
    },
    setTotalTagsCount: (count: number) => {
      (ctx as { totalTagsCount: number }).totalTagsCount = count;
    },
    ...overrides
  };
  return ctx;
}

@customElement('test-context-provider')
export class TestContextProvider extends LitElement {
  @provide({ context: userContext })
  @property({ attribute: false })
  userCtx: UserContextValue = createMockUserContext();

  @provide({ context: searchContext })
  @property({ attribute: false })
  searchCtx: SearchContextValue = createMockSearchContext();

  @provide({ context: configContext })
  @property({ attribute: false })
  configCtx: ConfigContextValue = createMockConfigContext();

  @provide({ context: appStatusContext })
  @property({ attribute: false })
  appStatusCtx: AppStatusContextValue = createMockAppStatusContext();

  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`<slot></slot>`;
  }
}
