import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { loadingController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../../vitest.setup';
import { UserSettings } from '../../../../helpers/schema.gen';
import { clearState } from '../../../../stores/state';
import '../page-settings-preferences';

describe('page-settings-preferences', () => {
  const originalFetch = globalThis.fetch;

  const mockSettings: UserSettings = {
    userId: 1,
    homeTitle: 'My Recipe Vault',
    homeImageUrl: 'https://example.com/banner.jpg',
    favoriteTags: ['dinner', 'dessert'],
  };

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

  it('builds and renders initial state before activation', async () => {
    const { root } = await render(<page-settings-preferences />);
    expect(root).toHaveClass('hydrated');

    const input = root.querySelector('ion-input');
    expect(input).not.toBeNull();
    expect(input).toEqualAttribute('label', 'Home Title');

    const img = root.querySelector('ion-thumbnail img');
    expect(img?.hasAttribute('hidden')).toBe(true);

    const buttons = root.querySelectorAll('ion-card ion-button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqualText('Save');
    expect(buttons[1]).toEqualText('Reset');
  });

  it('loads and renders user settings on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockSettings) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    const input = root.querySelector('ion-input');
    expect(input).toEqualAttribute('value', 'My Recipe Vault');

    const img = root.querySelector('ion-thumbnail img');
    expect(img).not.toBeNull();
    expect(img).toEqualAttribute('src', 'https://example.com/banner.jpg');
    expect(img?.hasAttribute('hidden')).toBe(false);

    const tagsInput = root.querySelector('tags-input');
    expect(tagsInput).not.toBeNull();
  });

  it('handles GET user settings failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    expect(consoleErrorSpy).toHaveBeenCalled();
    const img = root.querySelector('ion-thumbnail img');
    expect(img?.hasAttribute('hidden')).toBe(true);
  });

  it('updates title on input blur and favoriteTags on tags-input change', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockSettings) };
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return { status: 200, body: '' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    // Change title
    const input = root.querySelector<HTMLIonInputElement>('ion-input');
    if (input) {
      input.value = 'Updated Vault';
      input.dispatchEvent(new CustomEvent('ionBlur'));
    }
    await waitForChanges();

    // Change tags
    const tagsInput = root.querySelector('tags-input');
    tagsInput?.dispatchEvent(new CustomEvent('valueChanged', { detail: ['quick', 'easy'] }));
    await waitForChanges();

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

    const putReq = requests.find(r => r.url.match(/\/users\/current\/settings$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = (await putReq?.clone().json()) as UserSettings;
    expect(body.homeTitle).toBe('Updated Vault');
    expect(body.favoriteTags).toEqual(['quick', 'easy']);
  });

  it('does not save when form validity check fails', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockSettings) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    const form = root.querySelector('form');
    if (form) {
      vi.spyOn(form, 'reportValidity').mockReturnValue(false);
    }

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

    const putRequests = requests.filter(r => r.method === 'PUT');
    expect(putRequests).toHaveLength(0);
  });

  it('uploads selected image and sets homeImageUrl before saving settings', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockSettings) };
      }
      if (req.url.match(/\/uploads$/) && req.method === 'POST') {
        return {
          status: 201,
          body: '',
          headers: { location: '/uploads/images/new-banner.jpg' },
        };
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return { status: 200, body: '' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    const fileInput = root.querySelector<HTMLInputElement>('input[type="file"]');
    const mockFile = new File(['imagecontent'], 'new-banner.jpg', { type: 'image/jpeg' });
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: true,
      });
    }

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

    const uploadReq = requests.find(r => r.url.match(/\/uploads$/) && r.method === 'POST');
    expect(uploadReq).toBeDefined();

    const putReq = requests.find(r => r.url.match(/\/users\/current\/settings$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = (await putReq?.clone().json()) as UserSettings;
    expect(body.homeImageUrl).toBe('/uploads/images/new-banner.jpg');
  });

  it('displays toast error when image upload fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    const toast = mockToast();
    const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockSettings) };
      }
      if (req.url.match(/\/uploads$/) && req.method === 'POST') {
        return { status: 500, body: 'Upload error' };
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return { status: 200, body: '' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    const fileInput = root.querySelector<HTMLInputElement>('input[type="file"]');
    const mockFile = new File(['imagecontent'], 'fail.jpg', { type: 'image/jpeg' });
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: true,
      });
    }

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

    expect(createToastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to upload image.' })
    );
    expect(toast.present).toHaveBeenCalled();
  });

  it('displays toast error when saving preferences fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    const toast = mockToast();
    const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockSettings) };
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

    expect(createToastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to save preferences.' })
    );
    expect(toast.present).toHaveBeenCalled();
  });

  it('reloads user settings on reset button click', async () => {
    let getCount = 0;
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        getCount++;
        if (getCount === 1) {
          return { status: 200, body: JSON.stringify({ ...mockSettings, homeTitle: 'Initial Title' }) };
        }
        return { status: 200, body: JSON.stringify({ ...mockSettings, homeTitle: 'Reset Title' }) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsPreferencesElement>(<page-settings-preferences />);
    await root.activatedCallback();
    await waitForChanges();

    let input = root.querySelector('ion-input');
    expect(input).toEqualAttribute('value', 'Initial Title');

    const resetButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
    resetButton?.click();
    await waitForChanges();

    input = root.querySelector('ion-input');
    expect(input).toEqualAttribute('value', 'Reset Title');
    expect(getCount).toBe(2);
  });
});
