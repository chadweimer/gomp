import { render, h, describe, it, expect, beforeEach, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
import { alertController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { RecipeState, SavedSearchFilter, SavedSearchFilterCompact, SearchFilterSearchResult, SortBy, SortDir } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-settings-searches';

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

  function mockToast(): HTMLIonToastElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLIonToastElement;
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
        return { status: 200, body: JSON.stringify(mockFilterResult) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
    expect(root).toHaveClass('hydrated');

    await root.activatedCallback();
    await waitForChanges();

    const cards = root.querySelectorAll('ion-card');
    expect(cards).toHaveLength(2);

    const navigator = root.querySelector('page-navigator');
    expect(navigator).not.toBeNull();
    expect(navigator).toEqualAttribute('page', '1');
    expect(navigator).toEqualAttribute('numpages', '1');

    const fab = root.querySelector('ion-fab');
    expect(fab).not.toBeNull();
    const fabButton = root.querySelector('ion-fab-button');
    expect(fabButton).not.toBeNull();
  });

  it('loads and renders search filters on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockFilterResult) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
    await root.activatedCallback();
    await waitForChanges();

    const cards = root.querySelectorAll('ion-card');
    expect(cards).toHaveLength(2);

    const titles = root.querySelectorAll('ion-card-title');
    expect(titles[0]).toEqualText('Quick Dinners');
    expect(titles[1]).toEqualText('Desserts');
  });

  it('handles GET search filters failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    try {
      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();
      const cards = root.querySelectorAll('ion-card');
      expect(cards).toHaveLength(0);
    } catch (err) {
      expect(err).toBeDefined();
    }

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  describe('Pagination', () => {
    it('changes page when page-navigator emits pageChanged', async () => {
      let capturedUrl = '';
      const paginatedResult: SearchFilterSearchResult = {
        total: 100,
        filters: mockFilterCompacts,
      };

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          capturedUrl = req.url;
          return { status: 200, body: JSON.stringify(paginatedResult) };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const navigator = root.querySelector('page-navigator');
      expect(navigator).not.toBeNull();
      expect(navigator).toEqualAttribute('numpages', '5');

      navigator?.dispatchEvent(new CustomEvent('pageChanged', { detail: 2 }));
      await waitForChanges();

      expect(capturedUrl).toContain('page=2');
    });
  });

  describe('Load Search', () => {
    it('fetches filter details, updates state, and redirects to /recipes', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilter1) };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      // Click "Load" on the first card
      const loadBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button')[0];
      loadBtn?.click();
      await waitForChanges();

      expect(state.searchFilter.query).toBe('dinner');
      expect(state.searchFilter.tags).toEqual(['quick']);
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });

    it('handles GET filter details failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'GET') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const loadBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button')[0];
      loadBtn?.click();
      await waitForChanges();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(routerEl.push).not.toHaveBeenCalled();
    });
  });

  describe('Add Filter', () => {
    it('opens search-filter-editor modal and creates filter on confirm', async () => {
      const modal = mockModal({
        name: 'New Healthy Search',
        searchFilter: {
          query: 'healthy',
          withPictures: null,
          sortBy: SortBy.Name,
          sortDir: SortDir.Asc,
          fields: [],
          states: [RecipeState.Active],
          tags: ['healthy'],
        },
      });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters$/) && req.method === 'POST') {
          return { status: 201, body: JSON.stringify({ id: 3, name: 'New Healthy Search' }) };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const fabButton = root.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'search-filter-editor',
          componentProps: { prompt: 'New Search' },
          backdropDismiss: false,
        })
      );
      expect(modal.present).toHaveBeenCalled();

      const postReq = requests.find(r => r.url.match(/\/users\/current\/filters$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
      const body = (await postReq?.clone().json()) as SavedSearchFilter;
      expect(body.name).toBe('New Healthy Search');
      expect(body.query).toBe('healthy');
    });

    it('does not create filter when modal is dismissed without data', async () => {
      const modal = mockModal(null);
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const fabButton = root.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await waitForChanges();

      const postRequests = requests.filter(r => r.method === 'POST');
      expect(postRequests).toHaveLength(0);
    });

    it('displays toast error when creating filter fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      const modal = mockModal({
        name: 'Fail Search',
        searchFilter: { query: 'fail' },
      });
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters$/) && req.method === 'POST') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const fabButton = root.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create search filter.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Edit Filter', () => {
    it('loads filter details, opens modal with props, and updates filter on confirm', async () => {
      const modal = mockModal({
        name: 'Updated Dinners',
        searchFilter: {
          ...mockFilter1,
          query: 'quick dinner',
        },
      });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilter1) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'PUT') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      // Click "Edit" on the first card (second button in the first card)
      const editBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button')[1];
      editBtn?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'search-filter-editor',
          componentProps: {
            prompt: 'Edit Search',
            name: 'Quick Dinners',
            searchFilter: mockFilter1,
          },
          backdropDismiss: false,
        })
      );

      const putReq = requests.find(r => r.url.match(/\/users\/current\/filters\/1$/) && r.method === 'PUT');
      expect(putReq).toBeDefined();
      const body = (await putReq?.clone().json()) as SavedSearchFilter;
      expect(body.name).toBe('Updated Dinners');
      expect(body.query).toBe('quick dinner');
    });

    it('does not open modal when GET filter details fails during edit', async () => {
      const createModalSpy = vi.spyOn(modalController, 'create');

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'GET') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const editBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button')[1];
      editBtn?.click();
      await waitForChanges();

      expect(createModalSpy).not.toHaveBeenCalled();
    });

    it('does not save when edit modal is dismissed without data', async () => {
      const modal = mockModal(null);
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilter1) };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const editBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button')[1];
      editBtn?.click();
      await waitForChanges();

      const putRequests = requests.filter(r => r.method === 'PUT');
      expect(putRequests).toHaveLength(0);
    });

    it('displays toast error when updating filter fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      const modal = mockModal({
        name: 'Fail Search',
        searchFilter: { query: 'fail' },
      });
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilter1) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'PUT') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const editBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button')[1];
      editBtn?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save search filter.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Delete Filter', () => {
    it('prompts confirmation and deletes filter when confirmed', async () => {
      const alert = mockAlert('confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      // Click "Delete" on the first card (color="danger")
      const deleteBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button[color="danger"]')[0];
      deleteBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Delete Search Filter?',
          message: 'Are you sure you want to delete Quick Dinners?',
        })
      );
      expect(alert.present).toHaveBeenCalled();

      const deleteReq = requests.find(r => r.url.match(/\/users\/current\/filters\/1$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('does not delete filter when alert is cancelled', async () => {
      const alert = mockAlert('cancel');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const deleteBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button[color="danger"]')[0];
      deleteBtn?.click();
      await waitForChanges();

      const deleteRequests = requests.filter(r => r.method === 'DELETE');
      expect(deleteRequests).toHaveLength(0);
    });

    it('displays toast error when deleting filter fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);
      const alert = mockAlert('confirm');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockFilterResult) };
        }
        if (req.url.match(/\/users\/current\/filters\/1$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSearchesElement>(<page-settings-searches />);
      await root.activatedCallback();
      await waitForChanges();

      const deleteBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button[color="danger"]')[0];
      deleteBtn?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete search filter.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });
});
