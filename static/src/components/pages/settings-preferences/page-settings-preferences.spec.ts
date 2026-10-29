import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadingController, toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { UserSettings } from '../../../helpers/schema.gen';
import { clearState } from '../../../stores/state';
import './page-settings-preferences';
import { PageSettingsPreferences } from './page-settings-preferences';

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

  it('builds and renders initial state before activation', async () => {
    fetchMocker.mockResponse(() => Promise.resolve({ status: 404, body: '' }));

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await root.updateComplete;

    const input = root.renderRoot.querySelector('ion-input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('label')).toBe('Home Title');

    const img = root.renderRoot.querySelector('ion-thumbnail img');
    expect(img?.hasAttribute('hidden')).toBe(true);

    const buttons = root.renderRoot.querySelectorAll('ion-card ion-button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent?.trim()).toContain('Save');
    expect(buttons[1].textContent?.trim()).toContain('Reset');
  });

  it('loads and renders user settings on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.value).toBe('My Recipe Vault');

    const img = root.renderRoot.querySelector('ion-thumbnail img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/banner.jpg');
    expect(img?.hasAttribute('hidden')).toBe(false);

    const tagsInput = root.renderRoot.querySelector('tags-input');
    expect(tagsInput).not.toBeNull();
  });

  it('handles GET user settings failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.reject(new Error('Server error'));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    expect(consoleErrorSpy).toHaveBeenCalled();
    const img = root.renderRoot.querySelector('ion-thumbnail img');
    expect(img?.hasAttribute('hidden')).toBe(true);
  });

  it('updates title on input blur and favoriteTags on tags-input change', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    if (input) {
      input.value = 'Updated Vault';
      input.dispatchEvent(new CustomEvent('ionBlur'));
    }
    await root.updateComplete;

    const tagsInput = root.renderRoot.querySelector('tags-input');
    tagsInput?.dispatchEvent(new CustomEvent('valueChanged', { detail: ['quick', 'easy'] }));
    await root.updateComplete;

    const saveButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

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
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const form = root.renderRoot.querySelector('form');
    if (form) {
      vi.spyOn(form, 'reportValidity').mockReturnValue(false);
    }

    const saveButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const putRequests = requests.filter(r => r.method === 'PUT');
    expect(putRequests).toHaveLength(0);
  });

  it('uploads selected image and sets homeImageUrl before saving settings', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      if (req.url.match(/\/uploads$/) && req.method === 'POST') {
        return Promise.resolve(new Response('', {
          status: 201,
          headers: { location: 'https://example.com/new-banner.jpg' }
        }));
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const fileInput = root.renderRoot.querySelector<HTMLInputElement>('input[type="file"]');
    const dummyFile = new File(['image-bytes'], 'banner.jpg', { type: 'image/jpeg' });
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [dummyFile],
        writable: true
      });
    }

    const saveButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const uploadReq = requests.find(r => r.url.match(/\/uploads$/) && r.method === 'POST');
    expect(uploadReq).toBeDefined();

    const putReq = requests.find(r => r.url.match(/\/users\/current\/settings$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = (await putReq?.clone().json()) as UserSettings;
    expect(body.homeImageUrl).toBe('https://example.com/new-banner.jpg');
  });

  it('displays toast error when image upload fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    const toast = mockToast();
    const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      if (req.url.match(/\/uploads$/) && req.method === 'POST') {
        return Promise.resolve({ status: 500, body: 'Upload error' });
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const fileInput = root.renderRoot.querySelector<HTMLInputElement>('input[type="file"]');
    const mockFile = new File(['imagecontent'], 'fail.jpg', { type: 'image/jpeg' });
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: true,
      });
    }

    const saveButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

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
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'PUT') {
        return Promise.resolve({ status: 500, body: 'Server error' });
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const saveButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

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
          return Promise.resolve(JSON.stringify({ ...mockSettings, homeTitle: 'Initial Title' }));
        }
        return Promise.resolve(JSON.stringify({ ...mockSettings, homeTitle: 'Reset Title' }));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    let input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.value).toBe('Initial Title');

    const resetButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
    resetButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.value).toBe('Reset Title');
    expect(getCount).toBe(2);
  });
});
