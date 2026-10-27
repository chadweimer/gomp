import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadingController } from '@ionic/core';
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
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await root.updateComplete;

    const input = root.querySelector('ion-input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('label')).toBe('Home Title');

    const buttons = root.querySelectorAll('ion-card ion-button');
    expect(buttons).toHaveLength(2);
  });

  it('loads and renders user settings on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await root.activatedCallback();
    await root.updateComplete;

    const input = root.querySelector('ion-input');
    expect(input?.getAttribute('.value') ?? (input as any).value).toBe('My Recipe Vault');

    const img = root.querySelector('ion-thumbnail img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/banner.jpg');
    expect(img?.hasAttribute('hidden')).toBe(false);

    const tagsInput = root.querySelector('tags-input');
    expect(tagsInput).not.toBeNull();
  });

  it('handles GET user settings failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.reject(new Error('Server error'));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await root.activatedCallback();
    await root.updateComplete;

    expect(consoleErrorSpy).toHaveBeenCalled();
    const img = root.querySelector('ion-thumbnail img');
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
    await root.activatedCallback();
    await root.updateComplete;

    const input = root.querySelector<HTMLIonInputElement>('ion-input');
    if (input) {
      input.value = 'Updated Vault';
      input.dispatchEvent(new CustomEvent('ionBlur'));
    }
    await root.updateComplete;

    const tagsInput = root.querySelector('tags-input');
    tagsInput?.dispatchEvent(new CustomEvent('valueChanged', { detail: ['quick', 'easy'] }));
    await root.updateComplete;

    await root.onSaveSettingsClicked();
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
    await root.activatedCallback();
    await root.updateComplete;

    const form = root.querySelector('form');
    if (form) {
      vi.spyOn(form, 'reportValidity').mockReturnValue(false);
    }

    await root.onSaveSettingsClicked();
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
    await root.activatedCallback();
    await root.updateComplete;

    const fileInput = root.querySelector<HTMLInputElement>('input[type="file"]');
    const dummyFile = new File(['image-bytes'], 'banner.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [dummyFile],
      writable: true
    });

    await root.onSaveSettingsClicked();
    await root.updateComplete;

    const uploadReq = requests.find(r => r.url.match(/\/uploads$/) && r.method === 'POST');
    expect(uploadReq).toBeDefined();

    const putReq = requests.find(r => r.url.match(/\/users\/current\/settings$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = (await putReq?.clone().json()) as UserSettings;
    expect(body.homeImageUrl).toBe('https://example.com/new-banner.jpg');
  });

  it('resets settings on reset button click', async () => {
    let getCount = 0;
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        getCount++;
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsPreferences>(html`<page-settings-preferences></page-settings-preferences>`);
    await root.activatedCallback();
    await root.updateComplete;

    const resetButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
    resetButton?.click();
    await root.updateComplete;

    expect(getCount).toBeGreaterThanOrEqual(2);
  });
});
