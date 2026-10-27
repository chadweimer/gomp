import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../vitest.setup';
import { api } from '../../helpers/api';
import { AccessLevel, AppConfiguration, AppInfo } from '../../helpers/schema.gen';
import { getDefaultSearchFilter } from '../../models';
import appConfig from '../../stores/config';
import state, { clearState } from '../../stores/state';
import './app-root';
import type { AppRoot } from './app-root';

describe('app-root', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;

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

    routerEl = document.createElement('ion-router');
    routerEl.push = vi.fn().mockResolvedValue(true);
    document.body.appendChild(routerEl);

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
    routerEl?.remove();
    vi.restoreAllMocks();
  });

  it('mounts and renders the component', async () => {
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el).not.toBeNull();
    expect(el.querySelector('ion-app')).not.toBeNull();
  });

  it('loads and applies application configuration on mount', async () => {
    await fixture<AppRoot>(html`<app-root></app-root>`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(appConfig.info).toEqual(mockInfo);
    expect(appConfig.config).toEqual(mockConfig);
    expect(document.title).toBe(mockConfig.title);
  });

  describe('authorization and navigation rendering', () => {
    it('disables searchbars and filter buttons, and hides toolbar buttons when user is not authenticated', async () => {
      state.currentUser = undefined;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      expect(el.querySelector('ion-menu-button')).not.toBeNull();
      expect(el.querySelector('#toolbar-menu')).not.toBeNull();
      expect(el.querySelectorAll('#toolbar-menu ion-button')).toHaveLength(0);

      const searchbars = el.querySelectorAll('ion-searchbar');
      expect(searchbars).toHaveLength(2);
      searchbars.forEach((searchbar: any) => {
        expect(searchbar.hasAttribute('disabled') || searchbar.disabled).toBeTruthy();
      });

      const filterButtons = el.querySelectorAll('ion-button ion-icon[name="filter"], ion-button ion-icon[icon="filter"]');
      expect(filterButtons).toHaveLength(2);
      filterButtons.forEach((icon: any) => {
        const btn = icon.closest('ion-button');
        expect(btn.hasAttribute('disabled') || btn.disabled).toBeTruthy();
      });
    });

    it('renders only Home link in the side menu when user is not authenticated', async () => {
      state.currentUser = undefined;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const homeLink = el.querySelector('ion-item[href="/"]');
      expect(homeLink).not.toBeNull();

      expect(el.querySelector('ion-item[href="/recipes"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/tags"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/settings"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/settings/preferences"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/settings/searches"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/settings/security"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin/configuration"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin/users"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin/maintenance"]')).toBeNull();

      const logoutItem = Array.from(el.querySelectorAll('ion-item')).find((item) =>
        item.textContent?.includes('Logout')
      );
      expect(logoutItem).toBeDefined();
    });

    it('shows menu button, enabled searchbars, and toolbar links when user is authenticated', async () => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      expect(el.querySelector('ion-menu-button')).not.toBeNull();
      expect(el.querySelector('#toolbar-menu')).not.toBeNull();
      expect(el.querySelectorAll('#toolbar-menu ion-button').length).toBeGreaterThan(0);

      const searchbars = el.querySelectorAll('ion-searchbar');
      expect(searchbars).toHaveLength(2);
      searchbars.forEach((searchbar: any) => {
        expect(searchbar.hasAttribute('disabled')).toBe(false);
      });

      const filterButtons = el.querySelectorAll('ion-button ion-icon[name="filter"], ion-button ion-icon[icon="filter"]');
      expect(filterButtons).toHaveLength(2);
      filterButtons.forEach((icon: any) => {
        const btn = icon.closest('ion-button');
        expect(btn.hasAttribute('disabled')).toBe(false);
      });
    });

    it('renders viewer navigation and hides admin links for Viewer users', async () => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      state.totalRecipeCount = 42;
      state.totalTagsCount = 43;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      expect(el.querySelector('ion-menu-button')).not.toBeNull();
      expect(el.querySelector('ion-searchbar')).not.toBeNull();

      const homeLink = el.querySelector('ion-item[href="/"]');
      expect(homeLink).not.toBeNull();

      const recipesLink = el.querySelector('ion-item[href="/recipes"]');
      expect(recipesLink).not.toBeNull();
      expect(recipesLink?.textContent).toContain('42');

      const tagsLink = el.querySelector('ion-item[href="/tags"]');
      expect(tagsLink).not.toBeNull();
      expect(tagsLink?.textContent).toContain('43');

      const settingsLink = el.querySelector('ion-item[href="/settings"]');
      expect(settingsLink).not.toBeNull();

      const adminLink = el.querySelector('ion-item[href="/admin"]');
      expect(adminLink).toBeNull();
      expect(el.querySelector('ion-item[href="/admin/configuration"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin/users"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin/maintenance"]')).toBeNull();

      const preferencesLink = el.querySelector('ion-item[href="/settings/preferences"]');
      expect(preferencesLink).not.toBeNull();
      expect(preferencesLink?.classList.contains('child-link')).toBe(true);
      expect(settingsLink?.classList.contains('child-link')).toBe(false);
    });

    it('renders admin links and child routes for Admin users', async () => {
      state.currentUser = { id: 2, username: 'adminuser', accessLevel: AccessLevel.Admin };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const adminLink = el.querySelector('ion-item[href="/admin"]');
      expect(adminLink).not.toBeNull();
      expect(adminLink?.classList.contains('child-link')).toBe(false);

      const adminConfigLink = el.querySelector('ion-item[href="/admin/configuration"]');
      expect(adminConfigLink).not.toBeNull();
      expect(adminConfigLink?.classList.contains('child-link')).toBe(true);

      const adminUsersLink = el.querySelector('ion-item[href="/admin/users"]');
      expect(adminUsersLink).not.toBeNull();
      expect(adminUsersLink?.classList.contains('child-link')).toBe(true);

      const adminMaintenanceLink = el.querySelector('ion-item[href="/admin/maintenance"]');
      expect(adminMaintenanceLink).not.toBeNull();
      expect(adminMaintenanceLink?.classList.contains('child-link')).toBe(true);
    });

    it('preserves component classes (e.g. hydrated) when toggling pageTitle active state', async () => {
      state.currentUser = {
        id: 1,
        username: 'viewer',
        accessLevel: AccessLevel.Viewer,
      };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);

      const homeItem = el.querySelector<HTMLElement>('ion-item[href="/"]')!;
      expect(homeItem).not.toBeNull();

      homeItem.classList.add('hydrated', 'item', 'md');

      el.pageTitle = 'Home';
      await el.updateComplete;

      expect(homeItem.classList.contains('active')).toBe(true);
      expect(homeItem.classList.contains('hydrated')).toBe(true);
      expect(homeItem.classList.contains('item')).toBe(true);
      expect(homeItem.classList.contains('md')).toBe(true);

      el.pageTitle = 'Recipes';
      await el.updateComplete;

      expect(homeItem.classList.contains('active')).toBe(false);
      expect(homeItem.classList.contains('hydrated')).toBe(true);
      expect(homeItem.classList.contains('item')).toBe(true);
      expect(homeItem.classList.contains('md')).toBe(true);
    });
  });

  describe('route guards', () => {
    it('redirects to /login when unauthenticated user attempts to enter guarded routes', async () => {
      state.currentUser = undefined;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const homeRoute = el.querySelector<HTMLIonRouteElement>('ion-route[url="/"]');
      expect(homeRoute).not.toBeNull();
      expect(typeof homeRoute?.beforeEnter).toBe('function');

      const result = homeRoute?.beforeEnter?.();
      expect(result).toEqual({ redirect: '/login' });
    });

    it('allows access to guarded routes when user is authenticated', async () => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const homeRoute = el.querySelector<HTMLIonRouteElement>('ion-route[url="/"]');
      expect(homeRoute).not.toBeNull();

      const result = homeRoute?.beforeEnter?.();
      expect(result).toBe(true);
    });

    it('redirects non-admin users attempting to enter admin routes', async () => {
      state.currentUser = { id: 1, username: 'viewer', accessLevel: AccessLevel.Viewer };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const adminRoute = el.querySelector<HTMLIonRouteElement>('ion-route[url="/admin"]');
      expect(adminRoute).not.toBeNull();

      const result = adminRoute?.beforeEnter?.();
      expect(result).toEqual({ redirect: '/' });
    });

    it('allows admin users to enter admin routes', async () => {
      state.currentUser = { id: 2, username: 'admin', accessLevel: AccessLevel.Admin };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const adminRoute = el.querySelector<HTMLIonRouteElement>('ion-route[url="/admin"]');
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

      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      expect(el).toBeDefined();

      const router = el.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      // Trigger a request that returns 401
      const { response } = await api.client.GET('/users/current/settings');
      expect(response.status).toBe(401);
      await new Promise((r) => setTimeout(r, 50));

      expect(state.currentUser).toBeUndefined();
    });
  });

  describe('spinner indicators', () => {
    it('renders spinner when operations are loading', async () => {
      state.loadingCount = 2;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const spinner = el.querySelector('ion-spinner');
      expect(spinner).not.toBeNull();
      expect(spinner?.getAttribute('name')).toBe('bubbles');
    });

    it('does not render spinner when nothing is loading', async () => {
      state.loadingCount = 0;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const spinner = el.querySelector('ion-spinner');
      expect(spinner).toBeNull();
    });
  });

  describe('search bar interactions', () => {
    beforeEach(() => {
      state.currentUser = { id: 1, username: 'testuser', accessLevel: AccessLevel.Viewer };

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/app\/info$/)) {
          return { status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mockInfo) };
        }
        if (req.url.match(/\/app\/configuration$/)) {
          return { status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mockConfig) };
        }
        if (req.url.includes('/recipes')) {
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total: 0, recipes: [] }),
          };
        }
        if (req.url.includes('/tags')) {
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total: 0, tags: [] }),
          };
        }
        return { status: 404 };
      });
    });

    it('ignores search input and filter clicks when user is unauthenticated', async () => {
      state.currentUser = undefined;
      const initialFilter = { ...getDefaultSearchFilter() };
      state.searchFilter = initialFilter;

      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const router = el.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      const searchbar = el.querySelector<HTMLIonSearchbarElement>('ion-searchbar');
      expect(searchbar).not.toBeNull();
      if (searchbar) {
        searchbar.value = 'pasta';
        searchbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      expect(state.searchFilter).toEqual(initialFilter);
      if (router) {
        expect(router.push).not.toHaveBeenCalled();
      }

      searchbar?.dispatchEvent(new CustomEvent('ionClear', { bubbles: true }));
      expect(state.searchFilter).toEqual(initialFilter);
      if (router) {
        expect(router.push).not.toHaveBeenCalled();
      }

      searchbar?.dispatchEvent(new CustomEvent('ionCancel', { bubbles: true }));
      expect(state.searchFilter).toEqual(initialFilter);
      if (router) {
        expect(router.push).not.toHaveBeenCalled();
      }

      const filterButton = el.querySelector<HTMLIonButtonElement>('ion-button ion-icon[name="filter"]')?.closest('ion-button');
      expect(filterButton).not.toBeNull();
      filterButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      if (router) {
        expect(router.push).not.toHaveBeenCalled();
      }
    });

    it('updates query and redirects to /recipes on Enter key press', async () => {
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const router = el.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      const searchbar = el.querySelector<HTMLIonSearchbarElement>('ion-searchbar');
      expect(searchbar).not.toBeNull();
      if (searchbar) {
        searchbar.value = 'pasta';
        searchbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      expect(state.searchFilter.query).toBe('pasta');
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });

    it('clears query and redirects to /recipes on ionClear event', async () => {
      state.searchFilter.query = 'pasta';
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const router = el.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      const searchbar = el.querySelector<HTMLIonSearchbarElement>('ion-searchbar');
      expect(searchbar).not.toBeNull();
      searchbar?.dispatchEvent(new CustomEvent('ionClear', { bubbles: true }));

      expect(state.searchFilter.query).toBe('');
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });

    it('resets to default search filter and redirects to /recipes on ionCancel event', async () => {
      state.searchFilter = {
        ...getDefaultSearchFilter(),
        query: 'pasta',
        tags: ['dinner'],
      };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;

      const router = el.querySelector<HTMLIonRouterElement>('ion-router');
      if (router) {
        router.push = vi.fn().mockResolvedValue(true);
      }

      const searchbar = el.querySelector<HTMLIonSearchbarElement>('ion-searchbar');
      expect(searchbar).not.toBeNull();
      searchbar?.dispatchEvent(new CustomEvent('ionCancel', { bubbles: true }));

      expect(state.searchFilter).toEqual(getDefaultSearchFilter());
      expect(routerEl.push).toHaveBeenCalledWith('/recipes');
    });
  });

  describe('window popstate event', () => {
    it('handles window popstate without error', async () => {
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      expect(el).toBeDefined();

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
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;
      const router = setupRouterOutlet(el);
      expect(router).not.toBeNull();

      const title = el.querySelector('ion-title');
      expect(title?.querySelector('ion-text')).toBeNull();

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/recipes', from: '/' } }));
      await el.updateComplete;
      expect(title?.querySelector('ion-text')?.textContent?.trim()).toBe('| Recipes');

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/login', from: '/recipes' } }));
      await el.updateComplete;

      expect(title?.querySelector('ion-text')).toBeNull();

      const toolbarButtons = el.querySelectorAll('#toolbar-menu ion-button');
      toolbarButtons.forEach((btn) => {
        expect(btn.getAttribute('fill')).toBe('clear');
        expect(btn.classList.contains('active')).toBe(false);
      });

      const menuItems = el.querySelectorAll('ion-menu ion-item[href]');
      menuItems.forEach((item) => {
        expect(item.getAttribute('color')).toBeNull();
        expect(item.hasAttribute('detail')).toBe(false);
        expect(item.classList.contains('active')).toBe(false);
      });
    });

    it('updates pageTitle to "Home" on root route "/" and highlights only the Home side menu item', async () => {
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;
      const router = setupRouterOutlet(el);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/', from: '' } }));
      await el.updateComplete;

      const titleText = el.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText?.textContent?.trim()).toBe('| Home');

      const toolbarButtons = el.querySelectorAll('#toolbar-menu ion-button');
      expect(toolbarButtons.length).toBeGreaterThan(0);
      toolbarButtons.forEach((btn) => {
        expect(btn.getAttribute('fill')).toBe('clear');
        expect(btn.classList.contains('active')).toBe(false);
      });

      const homeItem = el.querySelector('ion-menu ion-item[href="/"]');
      expect(homeItem?.getAttribute('color')).toBe('secondary');
      expect(homeItem?.hasAttribute('detail')).toBe(true);
      expect(homeItem?.classList.contains('active')).toBe(true);

      const recipesItem = el.querySelector('ion-menu ion-item[href="/recipes"]');
      expect(recipesItem?.getAttribute('color')).toBeNull();
      expect(recipesItem?.hasAttribute('detail')).toBe(false);
      expect(recipesItem?.classList.contains('active')).toBe(false);
    });

    it('updates pageTitle to "Recipes" on "/recipes" and highlights matching toolbar buttons and side menu item', async () => {
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;
      const router = setupRouterOutlet(el);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/recipes', from: '/' } }));
      await el.updateComplete;

      const titleText = el.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText?.textContent?.trim()).toBe('| Recipes');

      const recipesButtons = el.querySelectorAll('#toolbar-menu ion-button[href="/recipes"]');
      expect(recipesButtons).toHaveLength(2);
      recipesButtons.forEach((btn) => {
        expect(btn.getAttribute('fill')).toBe('solid');
        expect(btn.classList.contains('active')).toBe(true);
      });

      const otherButtons = el.querySelectorAll('#toolbar-menu ion-button:not([href="/recipes"])');
      expect(otherButtons.length).toBeGreaterThan(0);
      otherButtons.forEach((btn) => {
        expect(btn.getAttribute('fill')).toBe('clear');
        expect(btn.classList.contains('active')).toBe(false);
      });

      const recipesItem = el.querySelector('ion-menu ion-item[href="/recipes"]');
      expect(recipesItem?.getAttribute('color')).toBe('secondary');
      expect(recipesItem?.hasAttribute('detail')).toBe(true);
      expect(recipesItem?.classList.contains('active')).toBe(true);

      const homeItem = el.querySelector('ion-menu ion-item[href="/"]');
      expect(homeItem?.getAttribute('color')).toBeNull();
      expect(homeItem?.hasAttribute('detail')).toBe(false);
      expect(homeItem?.classList.contains('active')).toBe(false);
    });

    it('updates pageTitle to "Recipes" on dynamic routes like "/recipes/123" and highlights matching toolbar buttons and side menu item', async () => {
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;
      const router = setupRouterOutlet(el);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/recipes/123', from: '/' } }));
      await el.updateComplete;

      const titleText = el.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText?.textContent?.trim()).toBe('| Recipes');

      const recipesButtons = el.querySelectorAll('#toolbar-menu ion-button[href="/recipes"]');
      expect(recipesButtons).toHaveLength(2);
      recipesButtons.forEach((btn) => {
        expect(btn.getAttribute('fill')).toBe('solid');
        expect(btn.classList.contains('active')).toBe(true);
      });

      const recipesItem = el.querySelector('ion-menu ion-item[href="/recipes"]');
      expect(recipesItem?.getAttribute('color')).toBe('secondary');
      expect(recipesItem?.hasAttribute('detail')).toBe(true);
      expect(recipesItem?.classList.contains('active')).toBe(true);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/recipes/456/', from: '/recipes/123' } }));
      await el.updateComplete;

      expect(el.querySelector('ion-title ion-text')?.textContent?.trim()).toBe('| Recipes');
      expect(recipesItem?.classList.contains('active')).toBe(true);
    });

    it('matches parent and child link on child routes like "/settings/preferences"', async () => {
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;
      const router = setupRouterOutlet(el);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/settings/preferences', from: '/' } }));
      await el.updateComplete;

      const titleText = el.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText?.textContent?.trim()).toBe('| Settings');

      const settingsButtons = el.querySelectorAll('#toolbar-menu ion-button[href="/settings"]');
      expect(settingsButtons).toHaveLength(2);
      settingsButtons.forEach((btn) => {
        expect(btn.getAttribute('fill')).toBe('solid');
        expect(btn.classList.contains('active')).toBe(true);
      });

      const settingsItem = el.querySelector('ion-menu ion-item[href="/settings"]');
      expect(settingsItem?.getAttribute('color')).toBeNull();
      expect(settingsItem?.hasAttribute('detail')).toBe(false);
      expect(settingsItem?.classList.contains('active')).toBe(true);
      expect(settingsItem?.querySelector('ion-icon')?.getAttribute('color')).toBe('secondary');
      expect(settingsItem?.querySelector('ion-label')?.getAttribute('color')).toBe('secondary');

      const preferencesItem = el.querySelector('ion-menu ion-item[href="/settings/preferences"]');
      expect(preferencesItem?.getAttribute('color')).toBe('secondary');
      expect(preferencesItem?.hasAttribute('detail')).toBe(true);
      expect(preferencesItem?.classList.contains('active')).toBe(true);

      const searchesItem = el.querySelector('ion-menu ion-item[href="/settings/searches"]');
      expect(searchesItem?.getAttribute('color')).toBeNull();
      expect(searchesItem?.hasAttribute('detail')).toBe(false);
      expect(searchesItem?.classList.contains('active')).toBe(false);
    });

    it('clears pageTitle on unmatched routes like /login when user is unauthenticated', async () => {
      state.currentUser = undefined;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;
      const router = setupRouterOutlet(el);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/login', from: '' } }));
      await el.updateComplete;

      const title = el.querySelector('ion-title');
      expect(title?.querySelector('ion-text')).toBeNull();

      const toolbarButtons = el.querySelectorAll('#toolbar-menu ion-button');
      expect(toolbarButtons).toHaveLength(0);

      const menuItems = el.querySelectorAll('ion-menu ion-item[href]');
      menuItems.forEach((item) => {
        expect(item.classList.contains('active')).toBe(false);
      });
    });

    it('updates pageTitle to "Home" on root route "/" and highlights Home without toolbar buttons when user is unauthenticated', async () => {
      state.currentUser = undefined;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await el.updateComplete;
      const router = setupRouterOutlet(el);

      router?.dispatchEvent(new CustomEvent('ionRouteDidChange', { detail: { to: '/', from: '' } }));
      await el.updateComplete;

      const titleText = el.querySelector('ion-title ion-text');
      expect(titleText).not.toBeNull();
      expect(titleText?.textContent?.trim()).toBe('| Home');

      const toolbarButtons = el.querySelectorAll('#toolbar-menu ion-button');
      expect(toolbarButtons).toHaveLength(0);

      const homeItem = el.querySelector('ion-menu ion-item[href="/"]');
      expect(homeItem).not.toBeNull();
      expect(homeItem?.getAttribute('color')).toBe('secondary');
      expect(homeItem?.hasAttribute('detail')).toBe(true);
      expect(homeItem?.classList.contains('active')).toBe(true);
    });
  });

  describe('logout and auth expiration', () => {
    it('clears state when user logs out', async () => {
      state.currentUser = {
        id: 1,
        username: 'viewer',
        accessLevel: AccessLevel.Viewer,
      };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);

      const logoutItem = Array.from(el.querySelectorAll('ion-item')).find((item) =>
        item.textContent?.includes('Logout')
      );
      expect(logoutItem).toBeDefined();

      logoutItem?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(state.currentUser).toBeUndefined();
    });
  });

  describe('registered page components', () => {
    it('defines and registers all page components', () => {
      expect(customElements.get('page-home')).toBeDefined();
      expect(customElements.get('page-login')).toBeDefined();
      expect(customElements.get('page-search')).toBeDefined();
      expect(customElements.get('page-recipe')).toBeDefined();
      expect(customElements.get('page-tags')).toBeDefined();
      expect(customElements.get('page-settings')).toBeDefined();
      expect(customElements.get('page-admin')).toBeDefined();
      expect(customElements.get('page-settings-preferences')).toBeDefined();
      expect(customElements.get('page-settings-searches')).toBeDefined();
      expect(customElements.get('page-settings-security')).toBeDefined();
      expect(customElements.get('page-admin-configuration')).toBeDefined();
      expect(customElements.get('page-admin-users')).toBeDefined();
      expect(customElements.get('page-admin-maintenance')).toBeDefined();
    });
  });
});
