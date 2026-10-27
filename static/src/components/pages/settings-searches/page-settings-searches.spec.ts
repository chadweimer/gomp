import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, modalController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { RecipeState, SavedSearchFilter, SavedSearchFilterCompact, SearchFilterSearchResult, SortBy, SortDir } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-settings-searches';
import { PageSettingsSearches } from './page-settings-searches';

describe('page-settings-searches', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;

  const mockFilterCompacts: SavedSearchFilterCompact[] = [
    { id: 1, name: 'Quick Dinners' },
    { id: 2, name: 'Desserts' },
  ];

  const mockFilterResult: SearchFilterSearchResult = {
    total: mockFilterCompacts.length,
    filters: mockFilterCompacts,
  };

  const mockFilter1: SavedSearchFilter = {
    id: 1,
    name: 'Quick Dinners',
    query: 'dinner',
    withPictures: null,
    sortBy: SortBy.Name,
    sortDir: SortDir.Asc,
    fields: [],
    states: [RecipeState.Active],
    tags: ['quick'],
  };

  function mockModal(data: unknown = null): HTMLIonModalElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data }),
    } as unknown as HTMLIonModalElement;
  }

  function mockAlert(role = 'confirm'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMocker.resetMocks();
    clearState();

    routerEl = document.createElement('ion-router');
    routerEl.push = vi.fn().mockResolvedValue(true);
    document.body.appendChild(routerEl);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    routerEl.remove();
    vi.restoreAllMocks();
  });

  it('builds and renders initial state with navigator', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockFilterResult));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsSearches>(html`<page-settings-searches></page-settings-searches>`);
    await root.activatedCallback();
    await root.updateComplete;

    const cards = root.querySelectorAll('ion-card');
    expect(cards).toHaveLength(2);

    const navigator = root.querySelector('page-navigator');
    expect(navigator).not.toBeNull();
  });

  it('loads search filter and redirects to /recipes on Load click', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/filters\/\d+$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockFilter1));
      }
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockFilterResult));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsSearches>(html`<page-settings-searches></page-settings-searches>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onLoadSearchClicked(1);
    expect(state.searchFilter.query).toBe('dinner');
    expect(routerEl.push).toHaveBeenCalledWith('/recipes');
  });

  it('opens search-filter-editor modal and saves new filter on Add click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockFilterResult));
      }
      if (req.url.match(/\/users\/current\/filters$/) && req.method === 'POST') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(modalController, 'create').mockResolvedValue(
      mockModal({ name: 'Brand New Search', searchFilter: { query: 'pizza' } })
    );

    const root = await fixture<PageSettingsSearches>(html`<page-settings-searches></page-settings-searches>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onAddFilterClicked();
    await root.updateComplete;

    const postReq = requests.find(r => r.url.match(/\/users\/current\/filters$/) && r.method === 'POST');
    expect(postReq).toBeDefined();
    const body = await postReq?.clone().json();
    expect(body.name).toBe('Brand New Search');
    expect(body.query).toBe('pizza');
  });

  it('opens search-filter-editor modal and saves updated filter on Edit click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/filters\/\d+$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockFilter1));
      }
      if (req.url.match(/\/users\/current\/filters\/\d+$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockFilterResult));
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(modalController, 'create').mockResolvedValue(
      mockModal({ name: 'Updated Search', searchFilter: { query: 'pasta' } })
    );

    const root = await fixture<PageSettingsSearches>(html`<page-settings-searches></page-settings-searches>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onEditFilterClicked(1);
    await root.updateComplete;

    const putReq = requests.find(r => r.url.match(/\/users\/current\/filters\/\d+$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = await putReq?.clone().json();
    expect(body.name).toBe('Updated Search');
    expect(body.query).toBe('pasta');
  });

  it('shows alert confirm and deletes filter on Delete click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/filters\/\d+$/) && req.method === 'DELETE') {
        return Promise.resolve('{}');
      }
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockFilterResult));
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

    const root = await fixture<PageSettingsSearches>(html`<page-settings-searches></page-settings-searches>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onDeleteFilterClicked(mockFilterCompacts[0]);
    await root.updateComplete;

    const deleteReq = requests.find(r => r.url.match(/\/users\/current\/filters\/\d+$/) && r.method === 'DELETE');
    expect(deleteReq).toBeDefined();
  });

  it('changes page on page navigator change', async () => {
    let requestedPage = 1;
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        const url = new URL(req.url);
        requestedPage = parseInt(url.searchParams.get('page') ?? '1', 10);
        return Promise.resolve(JSON.stringify({ total: 100, filters: mockFilterCompacts }));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsSearches>(html`<page-settings-searches></page-settings-searches>`);
    await root.activatedCallback();
    await root.updateComplete;

    root.setPage(3);
    await root.updateComplete;

    expect(requestedPage).toBe(3);
    expect(root.page).toBe(3);
  });
});
