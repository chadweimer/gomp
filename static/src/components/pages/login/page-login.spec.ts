import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, User } from '../../../helpers/schema.gen';
import { clearTestStorage, createMockUserContext } from '../../../testing/context-helpers';
import { UserContextValue } from '../../../context';
import './page-login';
import type { PageLogin } from './page-login';

describe('page-login', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;
  let mockUserCtx: UserContextValue;

  const mockUser: User = {
    id: 1,
    username: 'test@example.com',
    accessLevel: AccessLevel.Editor,
  };

  beforeEach(() => {
    clearTestStorage();
    fetchMocker.resetMocks();
    mockUserCtx = createMockUserContext();

    routerEl = document.createElement('ion-router');
    routerEl.push = vi.fn().mockResolvedValue(true);
    document.body.appendChild(routerEl);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearTestStorage();
    routerEl.remove();
    vi.restoreAllMocks();
  });

  it('builds and renders initial state', async () => {
    const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);

    const title = el.renderRoot.querySelector('ion-card-title');
    expect(title?.textContent?.trim()).toBe('Login');

    const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput?.getAttribute('label')).toBe('Email');
    expect(usernameInput?.getAttribute('autocomplete')).toBe('username');
    expect(usernameInput?.hasAttribute('required')).toBe(true);

    const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
    expect(passwordInput).not.toBeNull();
    expect(passwordInput?.getAttribute('label')).toBe('Password');
    expect(passwordInput?.getAttribute('autocomplete')).toBe('current-password');
    expect(passwordInput?.hasAttribute('required')).toBe(true);

    const toggle = el.renderRoot.querySelector('ion-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle?.textContent?.trim()).toBe('Remember Me');
    expect(toggle?.checked).toBe(false);

    const loginButton = el.renderRoot.querySelector('ion-button');
    expect(loginButton).not.toBeNull();
    expect(loginButton?.textContent?.trim()).toBe('Login');
  });

  it('updates rememberMe when toggle is changed', async () => {
    const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
    const toggle = el.renderRoot.querySelector('ion-toggle');

    toggle?.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: true } }));
    await el.updateComplete;

    expect(toggle?.checked).toBe(true);
  });

  describe('login flow', () => {
    it('successfully logs in with rememberMe false', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify(mockUser),
          };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
      const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const requests = fetchMocker.requests();
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toContain('/auth');

      expect(mockUserCtx.user).toEqual(mockUser);
      expect(usernameInput?.value).toBe('');
      expect(passwordInput?.value).toBe('');
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });

    it('successfully logs in with rememberMe true', async () => {
      let requestBody: { rememberMe?: boolean } | undefined;
      fetchMocker.mockResponse(async (req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          requestBody = (await req.json()) as { rememberMe?: boolean };
          return {
            status: 200,
            body: JSON.stringify(mockUser),
          };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
      const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const toggle = el.renderRoot.querySelector('ion-toggle');
      const loginButton = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';
      toggle?.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: true } }));

      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(requestBody?.rememberMe).toBe(true);
      expect(mockUserCtx.user).toEqual(mockUser);
    });

    it('successfully logs in when pressing Enter on username input', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify(mockUser),
          };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
      const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      usernameInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockUserCtx.user).toEqual(mockUser);
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });

    it('successfully logs in when pressing Enter on password input', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify(mockUser),
          };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
      const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      passwordInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockUserCtx.user).toEqual(mockUser);
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });

    it('does not trigger login on other keys', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify(mockUser),
          };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
      const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      usernameInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      passwordInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(fetchMocker.requests()).toHaveLength(0);
      expect(mockUserCtx.user).toBeUndefined();
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('displays error message and clears password on login failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return { status: 401, body: JSON.stringify({ message: 'Invalid credentials' }) };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
      const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'wrong@example.com';
      if (passwordInput) passwordInput.value = 'badpassword';

      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const errorText = el.renderRoot.querySelector('ion-text[color="danger"]');
      expect(errorText?.textContent?.trim()).toBeTruthy();
      expect(usernameInput?.value).toBe('wrong@example.com');
      expect(passwordInput?.value).toBe('');
      expect(mockUserCtx.user).toBeUndefined();
      expect(routerEl.push).not.toHaveBeenCalled();
    });

    it('clears error message on subsequent successful login', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      let attempt = 0;
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          attempt++;
          if (attempt === 1) {
            return { status: 401, body: JSON.stringify({ message: 'Invalid credentials' }) };
          }
          return {
            status: 200,
            body: JSON.stringify(mockUser),
          };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login .userCtx=${mockUserCtx}></page-login>`);
      const usernameInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'wrongpassword';

      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const errorText = el.renderRoot.querySelector('ion-text[color="danger"]');
      expect(errorText?.textContent?.trim()).toBeTruthy();

      // Retry with correct password
      if (passwordInput) passwordInput.value = 'correctpassword';
      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(el.renderRoot.querySelector('ion-text[color="danger"]')?.textContent?.trim()).toBeFalsy();
      expect(mockUserCtx.user).toEqual(mockUser);
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });
  });
});
