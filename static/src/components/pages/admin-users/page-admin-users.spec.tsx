import { render, h, describe, it, expect, beforeEach, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
import { alertController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, User, UserSearchResult } from '../../../helpers/schema.gen';
import { clearState } from '../../../stores/state';
import './page-admin-users';

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
    localStorage.clear();
    sessionStorage.clear();
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

    const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
    expect(root).toHaveClass('hydrated');

    await root.activatedCallback();
    await waitForChanges();

    const cards = root.querySelectorAll('ion-card');
    expect(cards).toHaveLength(3);

    const navigator = root.querySelector('page-navigator');
    expect(navigator).not.toBeNull();
    expect(navigator).toEqualAttribute('page', '1');
    expect(navigator).toEqualAttribute('numpages', '1');

    const fab = root.querySelector('ion-fab');
    expect(fab).not.toBeNull();
    const fabButton = root.querySelector('ion-fab-button');
    expect(fabButton).not.toBeNull();
  });

  it('loads and renders users on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockUserResult) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
    await root.activatedCallback();
    await waitForChanges();

    const cards = root.querySelectorAll('ion-card');
    expect(cards).toHaveLength(3);

    const titles = root.querySelectorAll('ion-card-title');
    expect(titles[0]).toEqualText('admin@example.com');
    expect(titles[1]).toEqualText('editor@example.com');
    expect(titles[2]).toEqualText('viewer@example.com');

    const subtitles = root.querySelectorAll('ion-card-subtitle');
    expect(subtitles[0]).toEqualText('Admin');
    expect(subtitles[1]).toEqualText('Editor');
    expect(subtitles[2]).toEqualText('Viewer');
  });

  it('handles GET users failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    try {
      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const fabButton = root.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'user-editor',
          backdropDismiss: false,
        })
      );
      expect(modal.present).toHaveBeenCalled();

      const postReq = requests.find(r => r.url.match(/\/users$/) && r.method === 'POST');
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const fabButton = root.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await waitForChanges();

      const postRequests = requests.filter(r => r.method === 'POST');
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const fabButton = root.querySelector<HTMLIonFabButtonElement>('ion-fab-button');
      fabButton?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const editButtons = root.querySelectorAll<HTMLIonButtonElement>('ion-button:not([color="danger"])');
      // Button 0 is the resultsPerPage in header; cards edit buttons start at index 1
      const cardEditButtons = Array.from(editButtons).filter(btn => btn.closest('ion-card'));
      expect(cardEditButtons.length).toBeGreaterThanOrEqual(2);
      cardEditButtons[1]?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'user-editor',
          componentProps: { user: mockUsers[1] },
          backdropDismiss: false,
        })
      );

      const putReq = requests.find(r => r.url.match(/\/users\/2$/) && r.method === 'PUT');
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const cardEditButtons = Array.from(root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button:not([color="danger"])'));
      cardEditButtons[0]?.click();
      await waitForChanges();

      const putRequests = requests.filter(r => r.method === 'PUT');
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const cardEditButtons = Array.from(root.querySelectorAll<HTMLIonButtonElement>('ion-card ion-button:not([color="danger"])'));
      cardEditButtons[0]?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const deleteButtons = root.querySelectorAll<HTMLIonButtonElement>('ion-button[color="danger"]');
      expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
      deleteButtons[1]?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Delete User?',
          message: 'Are you sure you want to delete editor@example.com?',
        })
      );
      expect(alert.present).toHaveBeenCalled();

      const deleteReq = requests.find(r => r.url.match(/\/users\/2$/) && r.method === 'DELETE');
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const deleteButtons = root.querySelectorAll<HTMLIonButtonElement>('ion-button[color="danger"]');
      deleteButtons[0]?.click();
      await waitForChanges();

      const deleteRequests = requests.filter(r => r.method === 'DELETE');
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

      const { root, waitForChanges } = await render<HTMLPageAdminUsersElement>(<page-admin-users />);
      await root.activatedCallback();
      await waitForChanges();

      const deleteButtons = root.querySelectorAll<HTMLIonButtonElement>('ion-button[color="danger"]');
      deleteButtons[0]?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete user.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });
});
