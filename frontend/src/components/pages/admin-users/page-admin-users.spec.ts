import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, modalController } from '@ionic/core';
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
        return Promise.resolve(JSON.stringify(mockUserResult));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    const cards = root.querySelectorAll('ion-card');
    expect(cards).toHaveLength(3);

    const navigator = root.querySelector('page-navigator');
    expect(navigator).not.toBeNull();
  });

  it('opens user-editor modal and saves new user on Add click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockUserResult));
      }
      if (req.url.match(/\/users$/) && req.method === 'POST') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(modalController, 'create').mockResolvedValue(
      mockModal({
        user: { username: 'newuser@example.com', accessLevel: AccessLevel.Editor },
        password: 'password123'
      })
    );

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onAddUserClicked();
    await root.updateComplete;

    const postReq = requests.find(r => r.url.match(/\/users$/) && r.method === 'POST');
    expect(postReq).toBeDefined();
    const body = await postReq?.clone().json();
    expect(body.username).toBe('newuser@example.com');
    expect(body.password).toBe('password123');
  });

  it('opens user-editor modal and saves updated user on Edit click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/\d+$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockUserResult));
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(modalController, 'create').mockResolvedValue(
      mockModal({ user: { username: 'admin@example.com', accessLevel: AccessLevel.Viewer } })
    );

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onEditUserClicked(mockUsers[0]);
    await root.updateComplete;

    const putReq = requests.find(r => r.url.match(/\/users\/\d+$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = await putReq?.clone().json();
    expect(body.accessLevel).toBe(AccessLevel.Viewer);
  });

  it('shows alert confirm and deletes user on Delete click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/\d+$/) && req.method === 'DELETE') {
        return Promise.resolve('{}');
      }
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockUserResult));
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onDeleteUserClicked(mockUsers[0]);
    await root.updateComplete;

    const deleteReq = requests.find(r => r.url.match(/\/users\/\d+$/) && r.method === 'DELETE');
    expect(deleteReq).toBeDefined();
  });

  it('changes page on page navigator change', async () => {
    let requestedPage = 1;
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users(\?.*)?$/) && req.method === 'GET') {
        const url = new URL(req.url);
        requestedPage = parseInt(url.searchParams.get('page') ?? '1', 10);
        return Promise.resolve(JSON.stringify({ total: 100, users: mockUsers }));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminUsers>(html`<page-admin-users></page-admin-users>`);
    await root.activatedCallback();
    await root.updateComplete;

    root.setPage(2);
    await root.updateComplete;

    expect(requestedPage).toBe(2);
    expect(root.page).toBe(2);
  });
});

