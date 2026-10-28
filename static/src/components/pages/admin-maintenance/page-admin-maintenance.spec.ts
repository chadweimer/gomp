import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController, loadingController, modalController, toastController } from '@ionic/core';
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

  function mockToast(): HTMLIonToastElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLIonToastElement;
  }

  function mockLoading(): HTMLIonLoadingElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(true),
    } as unknown as HTMLIonLoadingElement;
  }

  beforeEach(() => {
    localStorage?.clear();
    sessionStorage?.clear();
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

  it('builds and renders initial state', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return { status: 200, body: '[]' };
      }
      return { status: 404, body: '' };
    });

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.updateComplete;

    const title = root.renderRoot.querySelector('ion-card-title');
    expect(title?.textContent?.trim()).toBe('Backup & Restore');

    const items = root.renderRoot.querySelectorAll('ion-list ion-item');
    expect(items).toHaveLength(0);

    const slidingItems = root.renderRoot.querySelectorAll('ion-item-sliding');
    expect(slidingItems).toHaveLength(0);

    const buttons = root.renderRoot.querySelectorAll('ion-card > ion-button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.textContent?.trim()).toBe('Backup Now');
    expect(buttons[1]?.textContent?.trim()).toBe('Upload');
  });

  it('loads backups on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockBackups) };
      }
      return { status: 404, body: '' };
    });

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.activatedCallback();
    await root.updateComplete;

    const slidingItems = root.renderRoot.querySelectorAll('ion-item-sliding');
    expect(slidingItems).toHaveLength(2);

    const items = root.renderRoot.querySelectorAll('ion-item-sliding ion-item');
    expect(items).toHaveLength(2);

    const firstLabel = items[0].querySelector('ion-label');
    expect(firstLabel?.textContent).toContain('AutoBackup-1');
    expect(firstLabel?.querySelector('ion-note')?.textContent?.trim()).toBe('Version: 1.0');
    expect(items[0].querySelector('ion-note[slot="end"]')?.textContent?.trim()).toBe('Size: 2.00 MiB');

    const secondLabel = items[1].querySelector('ion-label');
    expect(secondLabel?.textContent).toContain('AutoBackup-2');
    expect(secondLabel?.querySelector('ion-note')?.textContent?.trim()).toBe('Version: 1.0');
    expect(items[1].querySelector('ion-note[slot="end"]')?.textContent?.trim()).toBe('Size: 1.00 MiB');

    const firstOptionsStart = slidingItems[0].querySelector('ion-item-options[side="start"]');
    expect(firstOptionsStart).not.toBeNull();
    const firstDeleteOption = firstOptionsStart?.querySelector('ion-item-option[color="danger"]');
    expect(firstDeleteOption?.textContent?.trim()).toBe('Delete');

    const firstOptionsEnd = slidingItems[0].querySelector('ion-item-options[side="end"]');
    expect(firstOptionsEnd).not.toBeNull();
    const firstDownloadOption = firstOptionsEnd?.querySelector('ion-item-option[color="medium"]');
    expect(firstDownloadOption?.textContent?.trim()).toBe('Download');
    const firstRestoreOption = firstOptionsEnd?.querySelector('ion-item-option[color="secondary"]');
    expect(firstRestoreOption?.textContent?.trim()).toBe('Restore');
  });

  it('handles GET backups failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
    await root.activatedCallback();
    await root.updateComplete;

    expect(consoleErrorSpy).toHaveBeenCalled();
    const items = root.renderRoot.querySelectorAll('ion-item-sliding ion-item');
    expect(items).toHaveLength(0);
  });

  describe('Create Backup', () => {
    it('creates backup when confirmed in alert dialog', async () => {
      const alert = mockAlert('confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);
      const loading = mockLoading();
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(loading);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups$/) && req.method === 'POST') {
          return { status: 201, body: JSON.stringify({}) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const backupNowBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[0];
      backupNowBtn?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Create Backup?' })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Creating backup...' })
      );
      expect(loading.present).toHaveBeenCalled();
      expect(loading.dismiss).toHaveBeenCalled();

      const postReq = requests.find((r) => r.url.match(/\/backups$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
    });

    it('does not create backup when alert is cancelled', async () => {
      const alert = mockAlert('cancel');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const backupNowBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[0];
      backupNowBtn?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      const postRequests = requests.filter((r) => r.method === 'POST');
      expect(postRequests).toHaveLength(0);
    });

    it('displays toast error when backup creation fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);
      const alert = mockAlert('confirm');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups$/) && req.method === 'POST') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const backupNowBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[0];
      backupNowBtn?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to create backup.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Delete Backup', () => {
    it('deletes backup when confirmed in alert dialog', async () => {
      const alert = mockAlert('confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);
      const loading = mockLoading();
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(loading);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups\/backup-2026-09-01\.zip$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const deleteOption = root.renderRoot.querySelector<HTMLIonItemOptionElement>('ion-item-option[color="danger"]');
      deleteOption?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Backup?' })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Deleting backup...' })
      );

      const deleteReq = requests.find((r) => r.url.match(/\/backups\/backup-2026-09-01\.zip$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('deletes backup when start options are swiped', async () => {
      const alert = mockAlert('confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);
      const loading = mockLoading();
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(loading);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups\/backup-2026-09-01\.zip$/) && req.method === 'DELETE') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const startOptions = root.renderRoot.querySelector<HTMLIonItemOptionsElement>('ion-item-options[side="start"]');
      startOptions?.dispatchEvent(new CustomEvent('ionSwipe'));
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Backup?' })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Deleting backup...' })
      );

      const deleteReq = requests.find((r) => r.url.match(/\/backups\/backup-2026-09-01\.zip$/) && r.method === 'DELETE');
      expect(deleteReq).toBeDefined();
    });

    it('does not delete backup when alert is cancelled', async () => {
      const alert = mockAlert('cancel');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const deleteOption = root.renderRoot.querySelector<HTMLIonItemOptionElement>('ion-item-option[color="danger"]');
      deleteOption?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      const deleteRequests = requests.filter((r) => r.method === 'DELETE');
      expect(deleteRequests).toHaveLength(0);
    });

    it('displays toast error when backup deletion fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);
      const alert = mockAlert('confirm');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups\/.+$/) && req.method === 'DELETE') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const deleteOption = root.renderRoot.querySelector<HTMLIonItemOptionElement>('ion-item-option[color="danger"]');
      deleteOption?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to delete backup.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Restore Backup', () => {
    it('restores backup when confirmed in alert dialog', async () => {
      const alert = mockAlert('confirm');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);
      const loading = mockLoading();
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(loading);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups\/backup-2026-09-01\.zip$/) && req.method === 'POST') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const restoreOption = root.renderRoot.querySelector<HTMLIonItemOptionElement>('ion-item-option[color="secondary"]');
      restoreOption?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Restore Backup?' })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Restoring backup...' })
      );

      const restoreReq = requests.find((r) => r.url.match(/\/backups\/backup-2026-09-01\.zip$/) && r.method === 'POST');
      expect(restoreReq).toBeDefined();
    });

    it('does not restore backup when alert is cancelled', async () => {
      const alert = mockAlert('cancel');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const restoreOption = root.renderRoot.querySelector<HTMLIonItemOptionElement>('ion-item-option[color="secondary"]');
      restoreOption?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      const restoreRequests = requests.filter((r) => r.method === 'POST' && r.url.match(/\/backups\/.+$/));
      expect(restoreRequests).toHaveLength(0);
    });

    it('displays toast error when backup restore fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);
      const alert = mockAlert('confirm');
      vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups\/.+$/) && req.method === 'POST') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const restoreOption = root.renderRoot.querySelector<HTMLIonItemOptionElement>('ion-item-option[color="secondary"]');
      restoreOption?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to restore from backup.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Upload Backup', () => {
    it('uploads file when file-upload-browser dismisses with a file', async () => {
      const mockFile = new File(['dummy backup'], 'backup.zip', { type: 'application/zip' });
      const modal = mockModal({ file: mockFile });
      const createModalSpy = vi.spyOn(modalController, 'create').mockResolvedValue(modal);
      const loading = mockLoading();
      const createLoadingSpy = vi.spyOn(loadingController, 'create').mockResolvedValue(loading);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups$/) && req.method === 'POST') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const uploadBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[1];
      uploadBtn?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'file-upload-browser',
          backdropDismiss: false,
        })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Uploading backup....' })
      );

      const postReq = requests.find((r) => r.url.match(/\/backups$/) && r.method === 'POST');
      expect(postReq).toBeDefined();
    });

    it('does not upload when modal is dismissed without data', async () => {
      const modal = mockModal(null);
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const uploadBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[1];
      uploadBtn?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      const postRequests = requests.filter((r) => r.method === 'POST');
      expect(postRequests).toHaveLength(0);
    });

    it('displays toast error when backup upload fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);
      const mockFile = new File(['dummy backup'], 'backup.zip', { type: 'application/zip' });
      const modal = mockModal({ file: mockFile });
      vi.spyOn(modalController, 'create').mockResolvedValue(modal);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        if (req.url.match(/\/backups$/) && req.method === 'POST') {
          return { status: 500, body: 'Server error' };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const uploadBtn = root.renderRoot.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[1];
      uploadBtn?.click();
      await new Promise((r) => setTimeout(r, 20));
      await root.updateComplete;

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to upload backup.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });

  describe('Download Backup', () => {
    it('creates an anchor link to trigger file download', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const root = await fixture<PageAdminMaintenance>(html`<page-admin-maintenance></page-admin-maintenance>`);
      await root.activatedCallback();
      await root.updateComplete;

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { });

      const downloadOption = root.renderRoot.querySelector<HTMLIonItemOptionElement>('ion-item-option[color="medium"]');
      downloadOption?.click();
      await root.updateComplete;

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
