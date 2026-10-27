import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, loadingController, modalController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { Backup } from '../../../helpers/schema.gen';
import { clearState } from '../../../stores/state';
import './page-admin-maintenance';
import { PageAdminMaintenance } from './page-admin-maintenance';

describe('page-admin-maintenance', () => {
  const originalFetch = globalThis.fetch;

  const mockBackups: Backup[] = [
    {
      fileName: 'backup-2026-09-01.zip',
      fileUrl: '/api/v1/backups/backup-2026-09-01.zip',
      metadata: {
        name: 'AutoBackup-1',
        version: '1.0',
      },
      sizeInBytes: 2097152, // 2 MiB
    },
    {
      fileName: 'backup-2026-09-02.zip',
      fileUrl: '/api/v1/backups/backup-2026-09-02.zip',
      metadata: {
        name: 'AutoBackup-2',
        version: '1.0',
      },
      sizeInBytes: 1048576, // 1 MiB
    },
  ];

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

  function mockLoading(): HTMLIonLoadingElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
    } as unknown as HTMLIonLoadingElement;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMocker.resetMocks();
    clearState();
    vi.spyOn(loadingController, 'create').mockResolvedValue(mockLoading());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    vi.restoreAllMocks();
  });

  it('builds and renders initial state with backup items', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockBackups));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.activatedCallback();
    await root.updateComplete;

    const items = root.querySelectorAll('ion-item-sliding');
    expect(items).toHaveLength(2);

    const labels = root.querySelectorAll('ion-item ion-label');
    expect(labels[0].textContent).toContain('AutoBackup-1');
    expect(labels[1].textContent).toContain('AutoBackup-2');
  });

  it('creates a backup on Backup Now click and confirm', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockBackups));
      }
      if (req.url.match(/\/backups$/) && req.method === 'POST') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.createBackupClicked();
    await root.updateComplete;

    const postReq = requests.find(r => r.url.match(/\/backups$/) && r.method === 'POST');
    expect(postReq).toBeDefined();
  });

  it('uploads a backup via file-upload-browser modal', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockBackups));
      }
      if (req.url.match(/\/backups$/) && req.method === 'POST') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    const dummyFile = new File(['dummy zip content'], 'my-backup.zip', { type: 'application/zip' });
    vi.spyOn(modalController, 'create').mockResolvedValue(
      mockModal({ file: dummyFile })
    );

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onUploadClicked();
    await root.updateComplete;

    const uploadReq = requests.find(r => r.url.match(/\/backups$/) && r.method === 'POST');
    expect(uploadReq).toBeDefined();
  });

  it('restores a backup on restore click and confirm', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/backups\/backup-2026-09-01\.zip$/) && req.method === 'POST') {
        return Promise.resolve('{}');
      }
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockBackups));
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onRestoreBackupClicked(mockBackups[0]);
    await root.updateComplete;

    const restoreReq = requests.find(r => r.url.match(/\/backups\/backup-2026-09-01\.zip$/) && r.method === 'POST');
    expect(restoreReq).toBeDefined();
  });

  it('deletes a backup on delete click and confirm', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/backups\/backup-2026-09-01\.zip$/) && req.method === 'DELETE') {
        return Promise.resolve('{}');
      }
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockBackups));
      }
      return Promise.resolve('{}');
    });

    vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.activatedCallback();
    await root.updateComplete;

    await root.onDeleteBackupClicked(mockBackups[0]);
    await root.updateComplete;

    const deleteReq = requests.find(r => r.url.match(/\/backups\/backup-2026-09-01\.zip$/) && r.method === 'DELETE');
    expect(deleteReq).toBeDefined();
  });

  it('downloads a backup via programmatic anchor click', async () => {
    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    root.onDownloadBackupClicked(mockBackups[0]);

    expect(clickSpy).toHaveBeenCalled();
  });
});

