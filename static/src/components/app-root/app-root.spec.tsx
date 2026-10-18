import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { fetchMocker } from '../../../vitest.setup';
import { api } from '../../helpers/api';
import { AccessLevel, AppConfiguration, AppInfo } from '../../helpers/schema.gen';
import { getDefaultSearchFilter } from '../../models';
import appConfig from '../../stores/config';
import state, { clearState } from '../../stores/state';
import './app-root';

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
      expect(root.querySelector('#toolbar-menu')).toBeNull();
    });

    it('shows menu button, searchbar, and toolbar links when user is authenticated', async () => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      const { root } = await render(<app-root />);

      expect(root.querySelector('ion-menu-button')).not.toBeNull();
      expect(root.querySelector('ion-searchbar')).not.toBeNull();
      expect(root.querySelector('#toolbar-menu')).not.toBeNull();
    });

    it('renders viewer navigation and hides admin links for Viewer users', async () => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      state.totalRecipeCount = 42;
      state.totalTagsCount = 43;
      const { root } = await render(<app-root />);

      expect(root.querySelector('ion-menu-button')).not.toBeNull();
      expect(root.querySelector('ion-searchbar')).not.toBeNull();

      const homeLink = root.querySelector('ion-item[href="/"]');
      expect(homeLink).not.toBeNull();

      const recipesLink = root.querySelector('ion-item[href="/recipes"]');
      expect(recipesLink).not.toBeNull();
      expect(recipesLink).toHaveTextContent('42');

      const tagsLink = root.querySelector('ion-item[href="/tags"]');
      expect(tagsLink).not.toBeNull();
      expect(tagsLink).toHaveTextContent('43');

      const settingsLink = root.querySelector('ion-item[href="/settings"]');
      expect(settingsLink).not.toBeNull();

      const adminLink = root.querySelector('ion-item[href="/admin"]');
      expect(adminLink).toBeNull();
      expect(root.querySelector('ion-item[href="/admin/configuration"]')).toBeNull();
      expect(root.querySelector('ion-item[href="/admin/users"]')).toBeNull();
      expect(root.querySelector('ion-item[href="/admin/maintenance"]')).toBeNull();

      const preferencesLink = root.querySelector('ion-item[href="/settings/preferences"]');
      expect(preferencesLink).not.toBeNull();
      expect(preferencesLink).toHaveClass('child-link');
      expect(settingsLink).not.toHaveClass('child-link');
    });

    it('renders admin links and child routes for Admin users', async () => {
      state.currentUser = { id: 2, username: 'adminuser', accessLevel: AccessLevel.Admin };
      const { root } = await render(<app-root />);

      const adminLink = root.querySelector('ion-item[href="/admin"]');
      expect(adminLink).not.toBeNull();
      expect(adminLink).not.toHaveClass('child-link');

      const adminConfigLink = root.querySelector('ion-item[href="/admin/configuration"]');
      expect(adminConfigLink).not.toBeNull();
      expect(adminConfigLink).toHaveClass('child-link');

      const adminUsersLink = root.querySelector('ion-item[href="/admin/users"]');
      expect(adminUsersLink).not.toBeNull();
      expect(adminUsersLink).toHaveClass('child-link');

      const adminMaintenanceLink = root.querySelector('ion-item[href="/admin/maintenance"]');
      expect(adminMaintenanceLink).not.toBeNull();
      expect(adminMaintenanceLink).toHaveClass('child-link');
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

      const { root, waitForChanges } = await render(<app-root />);
      expect(root).toBeDefined();

      const router = root.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      // Trigger a request that returns 401
      const { response } = await api.client.GET('/users/current/settings');
      expect(response.status).toBe(401);
      await waitForChanges();

      // State should be cleared and redirect triggered
      expect(state.currentUser).toBeUndefined();
      if (router) {
        expect(router.push).toHaveBeenCalledWith('/login');
      }
    });
  });

  describe('spinner indicators', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
    });

    it('renders spinner when operations are loading', async () => {
      state.loadingCount = 2;
      const { root } = await render(<app-root />);

      const spinner = root.querySelector('ion-spinner');
      expect(spinner).not.toBeNull();
      expect(spinner).toEqualAttribute('name', 'bubbles');
    });

    it('does not render spinner when nothing is loading', async () => {
      state.loadingCount = 0;
      const { root } = await render(<app-root />);

      const spinner = root.querySelector('ion-spinner');
      expect(spinner).toBeNull();
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
        if (req.url.match(/\/tags(\?.*)?$/)) {
          return {
            status: 200,
            body: JSON.stringify({ total: 0, tags: [] }),
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

  describe('pageTitle state and active navigation highlighting', () => {
    function setupRouterOutlet(root: HTMLElement) {
      const routerOutlet = root.querySelector<HTMLIonRouterOutletElement>('ion-router-outlet');
      if (routerOutlet) {
        routerOutlet.getRouteId = vi.fn().mockResolvedValue(undefined);
      }
      return root.querySelector('ion-router');
    }

    beforeEach(() => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      state.searchResults = [];
    });

    it('has empty pageTitle initially and clears pageTitle on unmatched routes like /login', async () => {
      const { root, waitForChanges } = await render(<app-root />);
      const router = setupRouterOutlet(root);
      expect(router).not.toBeNull();

      // Initially pageTitle is empty: no ion-text in ion-title
      const title = root.querySelector('ion-title');
      expect(title?.querySelector('ion-text')).toBeNull();

      // Navigate to /recipes first to set a non-empty pageTitle
      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/recipes', from: '/' } }));
      await waitForChanges();
      expect(title?.querySelector('ion-text')).toEqualText(' | Recipes');

      // Navigate to unmatched route /login -> clears pageTitle
      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/login', from: '/recipes' } }));
      await waitForChanges();

      expect(title?.querySelector('ion-text')).toBeNull();

      const toolbarButtons = root.querySelectorAll('#toolbar-menu ion-button');
      toolbarButtons.forEach(btn => {
        expect(btn).toEqualAttribute('fill', 'clear');
        expect(btn).not.toHaveClass('active');
      });

      const menuItems = root.querySelectorAll('ion-menu ion-item[href]');
      menuItems.forEach(item => {
        expect(item).not.toHaveAttribute('color');
        expect(item).not.toHaveAttribute('detail');
        expect(item).not.toHaveClass('active');
      });
    });

    it('updates pageTitle to "Home" on root route "/" and highlights only the Home side menu item', async () => {
      const { root, waitForChanges } = await render(<app-root />);
      const router = setupRouterOutlet(root);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/', from: '' } }));
      await waitForChanges();

      const titleText = root.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText).toEqualText(' | Home');

      // Home is not in toolbar, so all toolbar buttons remain inactive
      const toolbarButtons = root.querySelectorAll('#toolbar-menu ion-button');
      expect(toolbarButtons.length).toBeGreaterThan(0);
      toolbarButtons.forEach(btn => {
        expect(btn).toEqualAttribute('fill', 'clear');
        expect(btn).not.toHaveClass('active');
      });

      // Side menu: Home is active, others are inactive
      const homeItem = root.querySelector('ion-menu ion-item[href="/"]');
      expect(homeItem).toEqualAttribute('color', 'secondary');
      expect(homeItem).toHaveAttribute('detail');
      expect(homeItem).toHaveClass('active');

      const recipesItem = root.querySelector('ion-menu ion-item[href="/recipes"]');
      expect(recipesItem).not.toHaveAttribute('color');
      expect(recipesItem).not.toHaveAttribute('detail');
      expect(recipesItem).not.toHaveClass('active');
    });

    it('updates pageTitle to "Recipes" on "/recipes" and highlights matching toolbar buttons and side menu item', async () => {
      const { root, waitForChanges } = await render(<app-root />);
      const router = setupRouterOutlet(root);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/recipes', from: '/' } }));
      await waitForChanges();

      const titleText = root.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText).toEqualText(' | Recipes');

      // Toolbar: both desktop and mobile Recipes buttons are active/solid; others are clear
      const recipesButtons = root.querySelectorAll('#toolbar-menu ion-button[href="/recipes"]');
      expect(recipesButtons).toHaveLength(2);
      recipesButtons.forEach(btn => {
        expect(btn).toEqualAttribute('fill', 'solid');
        expect(btn).toHaveClass('active');
      });

      const otherButtons = root.querySelectorAll('#toolbar-menu ion-button:not([href="/recipes"])');
      expect(otherButtons.length).toBeGreaterThan(0);
      otherButtons.forEach(btn => {
        expect(btn).toEqualAttribute('fill', 'clear');
        expect(btn).not.toHaveClass('active');
      });

      // Side menu: Recipes is active, Home is inactive
      const recipesItem = root.querySelector('ion-menu ion-item[href="/recipes"]');
      expect(recipesItem).toEqualAttribute('color', 'secondary');
      expect(recipesItem).toHaveAttribute('detail');
      expect(recipesItem).toHaveClass('active');

      const homeItem = root.querySelector('ion-menu ion-item[href="/"]');
      expect(homeItem).not.toHaveAttribute('color');
      expect(homeItem).not.toHaveAttribute('detail');
      expect(homeItem).not.toHaveClass('active');
    });

    it('matches parent and child link on child routes like "/settings/preferences"', async () => {
      const { root, waitForChanges } = await render(<app-root />);
      const router = setupRouterOutlet(root);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/settings/preferences', from: '/' } }));
      await waitForChanges();

      const titleText = root.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText).toEqualText(' | Settings');

      // Toolbar: Settings buttons are active/solid
      const settingsButtons = root.querySelectorAll('#toolbar-menu ion-button[href="/settings"]');
      expect(settingsButtons).toHaveLength(2);
      settingsButtons.forEach(btn => {
        expect(btn).toEqualAttribute('fill', 'solid');
        expect(btn).toHaveClass('active');
      });

      // Side menu: parent Settings item has active class and secondary icon/label, while child Preferences item has secondary color and detail
      const settingsItem = root.querySelector('ion-menu ion-item[href="/settings"]');
      expect(settingsItem).not.toHaveAttribute('color');
      expect(settingsItem).not.toHaveAttribute('detail');
      expect(settingsItem).toHaveClass('active');
      expect(settingsItem?.querySelector('ion-icon')).toEqualAttribute('color', 'secondary');
      expect(settingsItem?.querySelector('ion-label')).toEqualAttribute('color', 'secondary');

      const preferencesItem = root.querySelector('ion-menu ion-item[href="/settings/preferences"]');
      expect(preferencesItem).toEqualAttribute('color', 'secondary');
      expect(preferencesItem).toHaveAttribute('detail');
      expect(preferencesItem).toHaveClass('active');

      const searchesItem = root.querySelector('ion-menu ion-item[href="/settings/searches"]');
      expect(searchesItem).not.toHaveAttribute('color');
      expect(searchesItem).not.toHaveAttribute('detail');
      expect(searchesItem).not.toHaveClass('active');
    });
  });
});
