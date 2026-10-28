import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, User, UserSearchResult } from '../../../helpers/schema.gen';
import { clearState } from '../../../stores/state';
import './page-admin-users';
import { PageAdminUsers } from './page-admin-users';

describe('page-admin-users', () => {
  const originalFetch = globalThis.fetch;

  const mockUsers: User[] = [
    { id: 1, username: 'admin@example.com', accessLevel: AccessLevel.Admin },
    { id: 2, username: 'editor@example.com', accessLevel: AccessLevel.Editor },
    { id: 3, username: 'viewer@example.com', accessLevel: AccessLevel.Viewer },
  ];

  const mockUserResult: UserSearchResult = {
    total: mockUsers.length,
    users: mockUsers,
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
    localStorage?.clear();
    sessionStorage?.clear();
    fetchMocker.resetMocks();
    clearState();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    vi.restoreAllMocks();
  });

  it('builds and renders initial state with navigator', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockUserResult) };
      }
      return { status: 404, body: '' };
    });

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    const cards = root.renderRoot.querySelectorAll('ion-card');
    expect(cards).toHaveLength(3);

    const navigator = root.renderRoot.querySelector('page-navigator') as any;
    expect(navigator).not.toBeNull();
    expect(navigator.page).toBe(1);
    expect(navigator.numPages).toBe(1);

    const fab = root.renderRoot.querySelector('ion-fab');
    expect(fab).not.toBeNull();
    const fabButton = root.renderRoot.querySelector('ion-fab-button');
    expect(fabButton).not.toBeNull();
  });

  it('loads and renders users on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockUserResult) };
      }
      return { status: 404, body: '' };
    });

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    const cards = root.renderRoot.querySelectorAll('ion-card');
    expect(cards).toHaveLength(3);

    const titles = root.renderRoot.querySelectorAll('ion-card-title');
    expect(titles[0]?.textContent?.trim()).toBe('admin@example.com');
    expect(titles[1]?.textContent?.trim()).toBe('editor@example.com');
    expect(titles[2]?.textContent?.trim()).toBe('viewer@example.com');

    const subtitles = root.renderRoot.querySelectorAll('ion-card-subtitle');
    expect(subtitles[0]?.textContent?.trim()).toBe('Admin');
    expect(subtitles[1]?.textContent?.trim()).toBe('Editor');
    expect(subtitles[2]?.textContent?.trim()).toBe('Viewer');
  });

  it('handles GET users failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    const cards = root.renderRoot.querySelectorAll('ion-card');
    expect(cards).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  describe('Pagination', () => {
    it('changes page when page-navigator emits pageChanged', async () => {
      let capturedUrl = '';
      const paginatedResult: UserSearchResult = {
        total: 100,
        users: mockUsers,
      };

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          capturedUrl = req.url;
          return { status: 200, body: JSON.stringify(paginatedResult) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const navigator = root.renderRoot.querySelector('page-navigator') as any;
      expect(navigator).not.toBeNull();
      expect(navigator.numPages).toBe(5);

      navigator?.dispatchEvent(new CustomEvent('pageChanged', { detail: 2 }));
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(capturedUrl).toContain('page=2');
    });
  });

  describe('Add User', () => {
    it('opens user-editor modal and creates user on confirm', async () => {
      const newUser: User = { username: 'newuser@example.com', accessLevel: AccessLevel.Editor };
      const modal = mockModal({ user: newUser, password: 'securePassword123' });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        if (req.url.match(/\/users$/) && req.method === 'POST') {
          return { status: 201, body: JSON.stringify({ id: 4, ...newUser }) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const fabButton = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'user-editor',
          backdropDismiss: false,
        })
      );
      expect(modal.present).toHaveBeenCalled();

      const postReq = requests.find((r) => r.url.match(/\/users$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
      const body = (await postReq?.clone().json()) as User & { password: string };
      expect(body.username).toBe('newuser@example.com');
      expect(body.accessLevel).toBe(AccessLevel.Editor);
      expect(body.password).toBe('securePassword123');
    });

    it('does not create user when modal is dismissed without data', async () => {
      const modal = mockModal(null);
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const fabButton = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const postRequests = requests.filter((r) => r.method === 'POST');
      expect(postRequests).toHaveLength(0);
    });

    it('displays toast error when creating user fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      const newUser: User = { username: 'fail@example.com', accessLevel: AccessLevel.Viewer };
      const modal = mockModal({ user: newUser, password: 'password' });
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        if (req.url.match(/\/users$/) && req.method === 'POST') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const fabButton = root.renderRoot.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create new user.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Edit User', () => {
    it('opens user-editor modal with existing user and updates on confirm', async () => {
      const updatedUser: User = { id: 2, username: 'updated-editor@example.com', accessLevel: AccessLevel.Admin };
      const modal = mockModal({ user: updatedUser });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        if (req.url.match(/\/users\/2$/) && req.method === 'PUT') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const cardEditButtons = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button:not([color="danger"])'));
      expect(cardEditButtons.length).toBeGreaterThanOrEqual(2);
      cardEditButtons[1]?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'user-editor',
          componentProps: { user: mockUsers[1] },
          backdropDismiss: false,
        })
      );

      const putReq = requests.find((r) => r.url.match(/\/users\/2$/) && r.method === 'PUT');
      expect(putReq).toBeDefined();
      const body = (await putReq?.clone().json()) as User;
      expect(body.username).toBe('updated-editor@example.com');
      expect(body.accessLevel).toBe(AccessLevel.Admin);
    });

    it('does not update user when modal is dismissed without data', async () => {
      const modal = mockModal(null);
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const cardEditButtons = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button:not([color="danger"])'));
      cardEditButtons[0]?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const putRequests = requests.filter((r) => r.method === 'PUT');
      expect(putRequests).toHaveLength(0);
    });

    it('displays toast error when updating user fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      const modal = mockModal({ user: { username: 'error@example.com' } });
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        if (req.url.match(/\/users\/1$/) && req.method === 'PUT') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const cardEditButtons = Array.from(root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button:not([color="danger"])'));
      cardEditButtons[0]?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save user.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Delete User', () => {
    it('prompts confirmation and deletes user when confirmed', async () => {
      const alert = mockAlert('confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        if (req.url.match(/\/users\/2$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const deleteButtons = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-button[color="danger"]');
      expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
      deleteButtons[1]?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Delete User?',
          message: 'Are you sure you want to delete editor@example.com?',
        })
      );
      expect(alert.present).toHaveBeenCalled();

      const deleteReq = requests.find((r) => r.url.match(/\/users\/2$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('does not delete user when alert is cancelled', async () => {
      const alert = mockAlert('cancel');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const deleteButtons = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-button[color="danger"]');
      deleteButtons[0]?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const deleteRequests = requests.filter((r) => r.method === 'DELETE');
      expect(deleteRequests).toHaveLength(0);
    });

    it('displays toast error when deleting user fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      const alert = mockAlert('confirm');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUserResult) };
        }
        if (req.url.match(/\/users\/1$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
      await root.activatedCallback();
      await root.updateComplete;

      const deleteButtons = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-button[color="danger"]');
      deleteButtons[0]?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete user.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });
});
