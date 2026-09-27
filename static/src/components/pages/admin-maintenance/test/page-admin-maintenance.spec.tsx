import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { actionSheetController, alertController, loadingController, modalController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../../vitest.setup';
import { Backup } from '../../../../helpers/schema.gen';
import { clearState } from '../../../../stores/state';
import '../page-admin-maintenance';

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

  function mockActionSheet(role = 'cancel'): HTMLIonActionSheetElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonActionSheetElement;
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

  it('builds and renders initial state', async () => {
    const { root } = await render(<page-admin-maintenance />);
    expect(root).toHaveClass('hydrated');

    const title = root.querySelector('ion-card-title');
    expect(title).toEqualText('Backup & Restore');

    const items = root.querySelectorAll('ion-item');
    expect(items).toHaveLength(0);

    const buttons = root.querySelectorAll('ion-card > ion-button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqualText('Backup Now');
    expect(buttons[1]).toEqualText('Upload');
  });

  it('loads backups on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockBackups) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
    await root.activatedCallback();
    await waitForChanges();

    const items = root.querySelectorAll('ion-item');
    expect(items).toHaveLength(2);

    const firstItemTitle = items[0].querySelector('h2');
    expect(firstItemTitle).toEqualText('AutoBackup-1');

    const firstItemDetails = items[0].querySelectorAll('p');
    expect(firstItemDetails[0]).toEqualText('Version: 1.0');
    expect(firstItemDetails[1]).toEqualText('Size: 2.00 MiB');

    const secondItemTitle = items[1].querySelector('h2');
    expect(secondItemTitle).toEqualText('AutoBackup-2');
    const secondItemDetails = items[1].querySelectorAll('p');
    expect(secondItemDetails[1]).toEqualText('Size: 1.00 MiB');
  });

  it('handles GET backups failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/backups$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
    await root.activatedCallback();
    await waitForChanges();

    expect(consoleErrorSpy).toHaveBeenCalled();
    const items = root.querySelectorAll('ion-item');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const backupNowBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[0];
      backupNowBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Create Backup?' })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Creating backup...' })
      );
      expect(loading.present).toHaveBeenCalled();
      expect(loading.dismiss).toHaveBeenCalled();

      const postReq = requests.find(r => r.url.match(/\/backups$/) && r.method === 'POST');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const backupNowBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[0];
      backupNowBtn?.click();
      await waitForChanges();

      const postRequests = requests.filter(r => r.method === 'POST');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const backupNowBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[0];
      backupNowBtn?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      // Find Delete button on first item (color="danger")
      const deleteBtn = root.querySelector<HTMLIonButtonElement>('ion-item ion-button[color="danger"]');
      deleteBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Backup?' })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Deleting backup...' })
      );

      const deleteReq = requests.find(r => r.url.match(/\/backups\/backup-2026-09-01\.zip$/) && r.method === 'DELETE');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const deleteBtn = root.querySelector<HTMLIonButtonElement>('ion-item ion-button[color="danger"]');
      deleteBtn?.click();
      await waitForChanges();

      const deleteRequests = requests.filter(r => r.method === 'DELETE');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const deleteBtn = root.querySelector<HTMLIonButtonElement>('ion-item ion-button[color="danger"]');
      deleteBtn?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      // Find Restore button on first item
      const restoreButtons = Array.from(root.querySelectorAll<HTMLIonButtonElement>('ion-item ion-button'));
      const restoreBtn = restoreButtons.find(b => b.textContent?.includes('Restore'));
      restoreBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Restore Backup?' })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Restoring backup...' })
      );

      const restoreReq = requests.find(r => r.url.match(/\/backups\/backup-2026-09-01\.zip$/) && r.method === 'POST');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const restoreButtons = Array.from(root.querySelectorAll<HTMLIonButtonElement>('ion-item ion-button'));
      const restoreBtn = restoreButtons.find(b => b.textContent?.includes('Restore'));
      restoreBtn?.click();
      await waitForChanges();

      const restoreRequests = requests.filter(r => r.method === 'POST' && r.url.match(/\/backups\/.+$/));
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const restoreButtons = Array.from(root.querySelectorAll<HTMLIonButtonElement>('ion-item ion-button'));
      const restoreBtn = restoreButtons.find(b => b.textContent?.includes('Restore'));
      restoreBtn?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const uploadBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[1];
      uploadBtn?.click();
      await waitForChanges();

      expect(createModalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'file-upload-browser',
          backdropDismiss: false,
        })
      );
      expect(createLoadingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Uploading backup....' })
      );

      const postReq = requests.find(r => r.url.match(/\/backups$/) && r.method === 'POST');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const uploadBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[1];
      uploadBtn?.click();
      await waitForChanges();

      const postRequests = requests.filter(r => r.method === 'POST');
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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const uploadBtn = root.querySelectorAll<HTMLIonButtonElement>('ion-card > ion-button')[1];
      uploadBtn?.click();
      await waitForChanges();

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

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { });

      const downloadButtons = Array.from(root.querySelectorAll<HTMLIonButtonElement>('ion-item ion-button'));
      const downloadBtn = downloadButtons.find(b => b.textContent?.includes('Download'));
      downloadBtn?.click();
      await waitForChanges();

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Mobile Action Sheet', () => {
    it('presents action sheet and triggers delete on destructive role', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const actionSheet = mockActionSheet('destructive');
      const createActionSheetSpy = vi.spyOn(actionSheetController, 'create').mockResolvedValue(actionSheet);
      const alert = mockAlert('cancel');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const menuBtn = root.querySelector<HTMLIonButtonElement>('ion-item ion-button.ion-hide-lg-up');
      menuBtn?.click();
      await waitForChanges();

      expect(createActionSheetSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'AutoBackup-1' })
      );
      expect(actionSheet.present).toHaveBeenCalled();
      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete Backup?' })
      );
    });

    it('triggers download on download role in action sheet', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const actionSheet = mockActionSheet('download');
      vi.spyOn(actionSheetController, 'create').mockResolvedValue(actionSheet);
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { });

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const menuBtn = root.querySelector<HTMLIonButtonElement>('ion-item ion-button.ion-hide-lg-up');
      menuBtn?.click();
      await waitForChanges();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('triggers restore confirmation on restore role in action sheet', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const actionSheet = mockActionSheet('restore');
      vi.spyOn(actionSheetController, 'create').mockResolvedValue(actionSheet);
      const alert = mockAlert('cancel');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const menuBtn = root.querySelector<HTMLIonButtonElement>('ion-item ion-button.ion-hide-lg-up');
      menuBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Restore Backup?' })
      );
    });

    it('does nothing on cancel role in action sheet', async () => {
      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/backups$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockBackups) };
        }
        return { status: 404, body: '' };
      });

      const actionSheet = mockActionSheet('cancel');
      vi.spyOn(actionSheetController, 'create').mockResolvedValue(actionSheet);
      const createAlertSpy = vi.spyOn(alertController, 'create');

      const { root, waitForChanges } = await render<HTMLPageAdminMaintenanceElement>(<page-admin-maintenance />);
      await root.activatedCallback();
      await waitForChanges();

      const menuBtn = root.querySelector<HTMLIonButtonElement>('ion-item ion-button.ion-hide-lg-up');
      menuBtn?.click();
      await waitForChanges();

      expect(createAlertSpy).not.toHaveBeenCalled();
    });
  });
});
