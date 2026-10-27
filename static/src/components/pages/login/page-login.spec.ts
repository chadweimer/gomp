import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, Credentials, User } from '../../../helpers/schema.gen';
import state, { clearState } from '../../../stores/state';
import './page-login';
import type { PageLogin } from './page-login';

describe('page-login', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLElement & { push?: ReturnType<typeof vi.fn> };

  const mockUser: User = {
    id: 1,
    username: 'test@example.com',
    accessLevel: AccessLevel.Editor,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMocker.resetMocks();
    clearState();

    routerEl = document.createElement('ion-router') as any;
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

  it('builds and renders initial state', async () => {
    const el = await fixture<PageLogin>(html`<page-login></page-login>`);

    const title = el.querySelector('ion-card-title');
    expect(title?.textContent?.trim()).toBe('Login');

    const usernameInput = el.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput?.getAttribute('label')).toBe('Email');
    expect(usernameInput?.getAttribute('autocomplete')).toBe('username');
    expect(usernameInput?.hasAttribute('required')).toBe(true);

    const passwordInput = el.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
    expect(passwordInput).not.toBeNull();
    expect(passwordInput?.getAttribute('label')).toBe('Password');
    expect(passwordInput?.getAttribute('autocomplete')).toBe('current-password');
    expect(passwordInput?.hasAttribute('required')).toBe(true);

    const loginButton = el.querySelector('ion-button');
    expect(loginButton).not.toBeNull();
    expect(loginButton?.textContent?.trim()).toBe('Login');

    const errorText = el.querySelector('ion-text[color="danger"]');
    expect(errorText?.textContent?.trim()).toBeFalsy();
  });

  describe('Authentication', () => {
    it('successfully logs in when clicking the login button', async () => {
      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify(mockUser),
          };
        }
        return { status: 404, body: '' };
      });

      const el = await fixture<PageLogin>(html`<page-login></page-login>`);
      const usernameInput = el.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = el.querySelector<HTMLIonButtonElement>('ion-button');

      expect(usernameInput).not.toBeNull();
      expect(passwordInput).not.toBeNull();

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const postReq = requests.find(r => r.url.match(/\/auth$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
      const body = (await postReq?.clone().json()) as Credentials;
      expect(body.username).toBe('test@example.com');
      expect(body.password).toBe('password123');

      expect(state.currentUser).toEqual(mockUser);
      expect(usernameInput?.value).toBe('');
      expect(passwordInput?.value).toBe('');
      expect(routerEl.push).toHaveBeenCalledWith('/');

      const errorText = el.querySelector('ion-text[color="danger"]');
      expect(errorText?.textContent?.trim()).toBeFalsy();
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

      const el = await fixture<PageLogin>(html`<page-login></page-login>`);
      const usernameInput = el.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      usernameInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(state.currentUser).toEqual(mockUser);
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

      const el = await fixture<PageLogin>(html`<page-login></page-login>`);
      const usernameInput = el.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      passwordInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(state.currentUser).toEqual(mockUser);
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

      const el = await fixture<PageLogin>(html`<page-login></page-login>`);
      const usernameInput = el.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      usernameInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      passwordInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(fetchMocker.requests()).toHaveLength(0);
      expect(state.currentUser).toBeUndefined();
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

      const el = await fixture<PageLogin>(html`<page-login></page-login>`);
      const usernameInput = el.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = el.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'wrong@example.com';
      if (passwordInput) passwordInput.value = 'badpassword';

      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const errorText = el.querySelector('ion-text[color="danger"]');
      expect(errorText?.textContent?.trim()).toBeTruthy();
      expect(usernameInput?.value).toBe('wrong@example.com');
      expect(passwordInput?.value).toBe('');
      expect(state.currentUser).toBeUndefined();
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

      const el = await fixture<PageLogin>(html`<page-login></page-login>`);
      const usernameInput = el.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = el.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = el.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'wrongpassword';

      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const errorText = el.querySelector('ion-text[color="danger"]');
      expect(errorText?.textContent?.trim()).toBeTruthy();

      // Retry with correct password
      if (passwordInput) passwordInput.value = 'correctpassword';
      loginButton?.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(el.querySelector('ion-text[color="danger"]')?.textContent?.trim()).toBeFalsy();
      expect(state.currentUser).toEqual(mockUser);
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });
  });
});

