import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchMocker } from '../../../vitest.setup';
import { AccessLevel, AppConfiguration, AppInfo } from '../../helpers/schema.gen';
import appConfig from '../../stores/config';
import state, { clearState } from '../../stores/state';
import './app-root';
import type { AppRoot } from './app-root';

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

  it('mounts and renders the component', async () => {
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el).not.toBeNull();
    expect(el.querySelector('ion-app')).not.toBeNull();
  });

  it('loads and applies application configuration on mount', async () => {
    await fixture<AppRoot>(html`<app-root></app-root>`);
    // Wait for microtasks
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(appConfig.info).toEqual(mockInfo);
    expect(appConfig.config).toEqual(mockConfig);
    expect(document.title).toBe(mockConfig.title);
  });

  describe('authorization and navigation rendering', () => {
    it('disables searchbars and hides authenticated toolbar buttons when user is not authenticated', async () => {
      state.currentUser = undefined;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);

      expect(el.querySelector('ion-menu-button')).not.toBeNull();
      expect(el.querySelector('[id="toolbar-menu"]')).not.toBeNull();
      expect(el.querySelectorAll('[id="toolbar-menu"] ion-button')).toHaveLength(0);

      const searchbars = el.querySelectorAll('ion-searchbar');
      expect(searchbars).toHaveLength(2);
      searchbars.forEach(searchbar => {
        expect(searchbar.hasAttribute('disabled') || searchbar.disabled).toBeTruthy();
      });
    });

    it('renders only Home and Logout in side menu when unauthenticated', async () => {
      state.currentUser = undefined;
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);

      const homeLink = el.querySelector('ion-item[href="/"]');
      expect(homeLink).not.toBeNull();

      expect(el.querySelector('ion-item[href="/recipes"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/tags"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/settings"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin"]')).toBeNull();
    });

    it('renders recipe, tag, and settings links when authenticated as Viewer', async () => {
      state.currentUser = {
        id: 1,
        username: 'viewer',
        accessLevel: AccessLevel.Viewer,
      };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);

      expect(el.querySelector('ion-item[href="/"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/recipes"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/tags"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/settings"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/settings/preferences"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/settings/searches"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/settings/security"]')).not.toBeNull();

      // Admin items should be hidden
      expect(el.querySelector('ion-item[href="/admin"]')).toBeNull();
      expect(el.querySelector('ion-item[href="/admin/configuration"]')).toBeNull();
    });

    it('renders admin links when authenticated as Admin', async () => {
      state.currentUser = {
        id: 1,
        username: 'admin',
        accessLevel: AccessLevel.Admin,
      };
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);

      expect(el.querySelector('ion-item[href="/admin"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/admin/configuration"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/admin/users"]')).not.toBeNull();
      expect(el.querySelector('ion-item[href="/admin/maintenance"]')).not.toBeNull();
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

      // Simulate Ionic adding runtime classes
      homeItem.classList.add('hydrated', 'item', 'md');

      // Change pageTitle to 'Home' to activate
      el.pageTitle = 'Home';
      await el.updateComplete;

      expect(homeItem.classList.contains('active')).toBe(true);
      expect(homeItem.classList.contains('hydrated')).toBe(true);
      expect(homeItem.classList.contains('item')).toBe(true);
      expect(homeItem.classList.contains('md')).toBe(true);

      // Change pageTitle to something else to deactivate
      el.pageTitle = 'Recipes';
      await el.updateComplete;

      expect(homeItem.classList.contains('active')).toBe(false);
      expect(homeItem.classList.contains('hydrated')).toBe(true);
      expect(homeItem.classList.contains('item')).toBe(true);
      expect(homeItem.classList.contains('md')).toBe(true);
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

      const logoutItem = Array.from(el.querySelectorAll('ion-item')).find(item => item.textContent?.includes('Logout'));
      expect(logoutItem).toBeDefined();

      logoutItem?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

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
