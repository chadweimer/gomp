import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { fetchMocker } from '../../../../../vitest.setup';
import { AccessLevel, AuthenticationResponse, Credentials, User } from '../../../../generated';
import state, { clearState } from '../../../../stores/state';
import '../page-login';

describe('page-login', () => {
  const originalFetch = globalThis.fetch;
  let routerEl: HTMLIonRouterElement;

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

  it('builds and renders initial state', async () => {
    const { root } = await render(<page-login />);
    expect(root).toHaveClass('hydrated');

    const title = root.querySelector('ion-card-title');
    expect(title).toEqualText('Login');

    const usernameInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput).toEqualAttribute('label', 'Email');
    expect(usernameInput).toEqualAttribute('autocomplete', 'username');
    expect(usernameInput).toHaveAttribute('required');

    const passwordInput = root.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
    expect(passwordInput).not.toBeNull();
    expect(passwordInput).toEqualAttribute('label', 'Password');
    expect(passwordInput).toEqualAttribute('autocomplete', 'current-password');
    expect(passwordInput).toHaveAttribute('required');

    const loginButton = root.querySelector('ion-button');
    expect(loginButton).not.toBeNull();
    expect(loginButton).toEqualText('Login');

    const errorText = root.querySelector('ion-text[color="danger"]');
    expect(errorText).toEqualText('');
  });

  describe('Authentication', () => {
    it('successfully logs in when clicking the login button', async () => {
      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify({ user: mockUser } as AuthenticationResponse),
          };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render(<page-login />);
      const usernameInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = root.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = root.querySelector<HTMLIonButtonElement>('ion-button');

      expect(usernameInput).not.toBeNull();
      expect(passwordInput).not.toBeNull();

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      loginButton?.click();
      await waitForChanges();

      const postReq = requests.find(r => r.url.match(/\/auth$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
      const body = (await postReq?.clone().json()) as Credentials;
      expect(body.username).toBe('test@example.com');
      expect(body.password).toBe('password123');

      expect(state.currentUser).toEqual(mockUser);
      expect(usernameInput?.value).toBe('');
      expect(passwordInput?.value).toBe('');
      expect(routerEl.push).toHaveBeenCalledWith('/');

      const errorText = root.querySelector('ion-text[color="danger"]');
      expect(errorText).toEqualText('');
    });

    it('successfully logs in when pressing Enter on username input', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify({ user: mockUser } as AuthenticationResponse),
          };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render(<page-login />);
      const usernameInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = root.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      usernameInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await waitForChanges();

      expect(state.currentUser).toEqual(mockUser);
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });

    it('successfully logs in when pressing Enter on password input', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify({ user: mockUser } as AuthenticationResponse),
          };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render(<page-login />);
      const usernameInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = root.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      passwordInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await waitForChanges();

      expect(state.currentUser).toEqual(mockUser);
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });

    it('does not trigger login on other keys', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/auth$/) && req.method === 'POST') {
          return {
            status: 200,
            body: JSON.stringify({ user: mockUser } as AuthenticationResponse),
          };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render(<page-login />);
      const usernameInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = root.querySelector<HTMLIonInputElement>('ion-input[type="password"]');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'password123';

      usernameInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      passwordInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await waitForChanges();

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

      const { root, waitForChanges } = await render(<page-login />);
      const usernameInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = root.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = root.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'wrong@example.com';
      if (passwordInput) passwordInput.value = 'badpassword';

      loginButton?.click();
      await waitForChanges();

      const errorText = root.querySelector('ion-text[color="danger"]');
      expect(errorText).not.toEqualText('');
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
            body: JSON.stringify({ user: mockUser } as AuthenticationResponse),
          };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render(<page-login />);
      const usernameInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      const passwordInput = root.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
      const loginButton = root.querySelector<HTMLIonButtonElement>('ion-button');

      if (usernameInput) usernameInput.value = 'test@example.com';
      if (passwordInput) passwordInput.value = 'wrongpassword';

      loginButton?.click();
      await waitForChanges();

      const errorText = root.querySelector('ion-text[color="danger"]');
      expect(errorText).not.toEqualText('');

      // Retry with correct password
      if (passwordInput) passwordInput.value = 'correctpassword';
      loginButton?.click();
      await waitForChanges();

      expect(errorText).toEqualText('');
      expect(state.currentUser).toEqual(mockUser);
      expect(routerEl.push).toHaveBeenCalledWith('/');
    });
  });
});
