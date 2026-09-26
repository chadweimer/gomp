import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, AppConfiguration, AppInfo } from '../../../generated';
import { getDefaultSearchFilter } from '../../../models';
import appConfig from '../../../stores/config';
import state, { clearState } from '../../../stores/state';
import '../app-root';

describe('app-root', () => {
  const originalFetch = globalThis.fetch;
  const mockInfo: AppInfo = {
    copyright: '© 2026 My Recipe App',
    version: '1.0.0',
  };
  const mockConfig: AppConfiguration = {
    title: 'My Recipe App',
  };

  beforeEach(() => {
    fetchMocker.resetMocks();
    clearState();

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/info$/)) {
        return {
          status: 200,
          body: JSON.stringify(mockInfo),
        };
      }
      if (req.url.match(/\/app\/configuration$/)) {
        return {
          status: 200,
          body: JSON.stringify(mockConfig),
        };
      }
      return {
        status: 404,
      };
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
  });

  it('builds and hydrates the component', async () => {
    const { root } = await render(<app-root />);
    expect(root).toHaveClass('hydrated');
  });

  it('loads and applies application configuration on mount', async () => {
    await render(<app-root />);

    expect(appConfig.info).toEqual(mockInfo);
    expect(appConfig.config).toEqual(mockConfig);
    expect(document.title).toBe(mockConfig.title);
  });

  describe('authorization and navigation rendering', () => {
    it('hides menu button, searchbar, and toolbar links when user is not authenticated', async () => {
      state.currentUser = undefined;
      const { root } = await render(<app-root />);

      expect(root.querySelector('ion-menu-button')).toBeNull();
      expect(root.querySelector('ion-searchbar')).toBeNull();
      expect(root.querySelector('ion-buttons.ion-hide-md-down')).toBeNull();
    });

    it('renders viewer navigation and hides admin links for Viewer users', async () => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      state.totalRecipeCount = 42;
      const { root } = await render(<app-root />);

      expect(root.querySelector('ion-menu-button')).not.toBeNull();
      expect(root.querySelector('ion-searchbar')).not.toBeNull();

      const homeLink = root.querySelector('ion-item[href="/"]');
      expect(homeLink).not.toBeNull();

      const recipesLink = root.querySelector('ion-item[href="/recipes"]');
      expect(recipesLink).not.toBeNull();
      expect(recipesLink?.textContent).toContain('42');

      const settingsLink = root.querySelector('ion-item[href="/settings"]');
      expect(settingsLink).not.toBeNull();

      const adminLink = root.querySelector('ion-item[href="/admin"]');
      expect(adminLink).toBeNull();
    });

    it('renders admin links and child routes for Admin users', async () => {
      state.currentUser = { id: 2, username: 'adminuser', accessLevel: AccessLevel.Admin };
      const { root } = await render(<app-root />);

      const adminLink = root.querySelector('ion-item[href="/admin"]');
      expect(adminLink).not.toBeNull();

      const adminConfigLink = root.querySelector('ion-item[href="/admin/configuration"]');
      expect(adminConfigLink).not.toBeNull();

      const adminUsersLink = root.querySelector('ion-item[href="/admin/users"]');
      expect(adminUsersLink).not.toBeNull();

      const adminMaintenanceLink = root.querySelector('ion-item[href="/admin/maintenance"]');
      expect(adminMaintenanceLink).not.toBeNull();
    });
  });

  describe('route guards', () => {
    it('redirects to /login when unauthenticated user attempts to enter guarded routes', async () => {
      state.currentUser = undefined;
      const { root } = await render(<app-root />);

      const homeRoute = root.querySelector<HTMLIonRouteElement>('ion-route[url="/"]');
      expect(homeRoute).not.toBeNull();
      expect(typeof homeRoute?.beforeEnter).toBe('function');

      const result = homeRoute?.beforeEnter?.();
      expect(result).toEqual({ redirect: '/login' });
    });

    it('allows access to guarded routes when user is authenticated', async () => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      const { root } = await render(<app-root />);

      const homeRoute = root.querySelector<HTMLIonRouteElement>('ion-route[url="/"]');
      expect(homeRoute).not.toBeNull();

      const result = homeRoute?.beforeEnter?.();
      expect(result).toBe(true);
    });

    it('redirects non-admin users attempting to enter admin routes', async () => {
      state.currentUser = { id: 1, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const { root } = await render(<app-root />);

      const adminRoute = root.querySelector<HTMLIonRouteElement>('ion-route[url="/admin"]');
      expect(adminRoute).not.toBeNull();

      const result = adminRoute?.beforeEnter?.();
      expect(result).toEqual({ redirect: '/' });
    });

    it('allows admin users to enter admin routes', async () => {
      state.currentUser = { id: 2, username: 'admin', accessLevel: AccessLevel.Admin };
      const { root } = await render(<app-root />);

      const adminRoute = root.querySelector<HTMLIonRouteElement>('ion-route[url="/admin"]');
      expect(adminRoute).not.toBeNull();

      const result = adminRoute?.beforeEnter?.();
      expect(result).toBe(true);
    });
  });

  describe('fetch 401 interceptor', () => {
    it('triggers logout and clears state when an API returns 401', async () => {
      state.currentUser = { id: 1, username: 'user', accessLevel: AccessLevel.Viewer };

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/app\/info$/)) {
          return { status: 200, body: JSON.stringify(mockInfo) };
        }
        if (req.url.match(/\/app\/configuration$/)) {
          return { status: 200, body: JSON.stringify(mockConfig) };
        }
        if (req.url.match(/\/users\/current\/settings$/)) {
          return { status: 401 };
        }
        if (req.url.match(/\/auth$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return { status: 404 };
      });

      const { root } = await render(<app-root />);
      expect(root).toBeDefined();

      const router = root.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      // Trigger a request that returns 401
      await globalThis.fetch('/api/v1/users/current/settings');

      // State should be cleared and redirect triggered
      expect(state.currentUser).toBeUndefined();
      if (router) {
        expect(router.push).toHaveBeenCalledWith('/login');
      }
    });
  });

  describe('progress bar indicators', () => {
    it('renders indeterminate progress bar when operations are loading', async () => {
      state.loadingCount = 2;
      const { root } = await render(<app-root />);

      const progressBar = root.querySelector('ion-progress-bar');
      expect(progressBar).not.toBeNull();
      expect(progressBar?.getAttribute('type')).toBe('indeterminate');
      expect(progressBar?.getAttribute('color')).toBe('secondary');
    });

    it('renders static 100% progress bar when nothing is loading', async () => {
      state.loadingCount = 0;
      const { root } = await render(<app-root />);

      const progressBar = root.querySelector('ion-progress-bar');
      expect(progressBar).not.toBeNull();
      expect(progressBar?.getAttribute('value')).toBe('100');
      expect(progressBar?.getAttribute('color')).toBe('primary');
    });
  });

  describe('search bar interactions', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/app\/info$/)) {
          return { status: 200, body: JSON.stringify(mockInfo) };
        }
        if (req.url.match(/\/app\/configuration$/)) {
          return { status: 200, body: JSON.stringify(mockConfig) };
        }
        if (req.url.match(/\/recipes(\?.*)?$/)) {
          return {
            status: 200,
            body: JSON.stringify({ total: 0, recipes: [] }),
          };
        }
        return { status: 404 };
      });
    });

    it('updates query and redirects to /recipes on Enter key press', async () => {
      const { root } = await render(<app-root />);
      const router = root.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      const searchbar = root.querySelector<HTMLIonSearchbarElement>('ion-searchbar');
      expect(searchbar).not.toBeNull();
      if (searchbar) {
        searchbar.value = 'pasta';
        searchbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      expect(state.searchFilter.query).toBe('pasta');
      if (router) {
        expect(router.push).toHaveBeenCalledWith('/recipes');
      }
    });

    it('clears query and redirects to /recipes on ionClear event', async () => {
      state.searchFilter.query = 'pasta';
      const { root } = await render(<app-root />);
      const router = root.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      const searchbar = root.querySelector<HTMLIonSearchbarElement>('ion-searchbar');
      expect(searchbar).not.toBeNull();
      searchbar?.dispatchEvent(new CustomEvent('ionClear', { bubbles: true }));

      expect(state.searchFilter.query).toBe('');
      if (router) {
        expect(router.push).toHaveBeenCalledWith('/recipes');
      }
    });

    it('resets to default search filter and redirects to /recipes on ionCancel event', async () => {
      state.searchFilter = {
        ...getDefaultSearchFilter(),
        query: 'pasta',
        tags: ['dinner'],
      };
      const { root } = await render(<app-root />);
      const router = root.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      const searchbar = root.querySelector<HTMLIonSearchbarElement>('ion-searchbar');
      expect(searchbar).not.toBeNull();
      searchbar?.dispatchEvent(new CustomEvent('ionCancel', { bubbles: true }));

      expect(state.searchFilter).toEqual(getDefaultSearchFilter());
      if (router) {
        expect(router.push).toHaveBeenCalledWith('/recipes');
      }
    });
  });

  describe('window popstate event', () => {
    it('handles window popstate without error', async () => {
      const { root } = await render(<app-root />);
      expect(root).toBeDefined();

      expect(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      }).not.toThrow();
    });
  });
});
