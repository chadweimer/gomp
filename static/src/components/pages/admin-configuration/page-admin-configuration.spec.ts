import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AppConfiguration } from '../../../helpers/schema.gen';
import appConfig from '../../../stores/config';
import { clearState } from '../../../stores/state';
import './page-admin-configuration';
import { PageAdminConfiguration } from './page-admin-configuration';

describe('page-admin-configuration', () => {
  const originalFetch = globalThis.fetch;

  const mockConfig: AppConfiguration = {
    title: 'Custom Meal Planner',
  };

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
    appConfig.config = { title: 'GOMP: Go Meal Planner' };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    vi.restoreAllMocks();
  });

  it('builds and renders initial state', async () => {
    fetchMocker.mockResponse(() => Promise.resolve({ status: 404, body: '' }));

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await root.updateComplete;

    const input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('label')).toBe('Application Title');
    expect(input?.value).toBe('GOMP: Go Meal Planner');

    const buttons = root.renderRoot.querySelectorAll('ion-button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent?.trim()).toContain('Save');
    expect(buttons[1].textContent?.trim()).toContain('Reset');
  });

  it('loads configuration on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockConfig));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await root.activatedCallback();
    await root.updateComplete;

    const input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.value).toBe('Custom Meal Planner');
  });

  it('handles GET configuration failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return Promise.resolve({ status: 500, body: 'Server error' });
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await root.activatedCallback();
    await root.updateComplete;

    expect(consoleErrorSpy).toHaveBeenCalled();
    const input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.value).toBe('GOMP: Go Meal Planner');
  });

  it('updates configuration on input blur and saves on save button click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockConfig));
      }
      if (req.url.match(/\/app\/configuration$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input).not.toBeNull();
    if (input) {
      input.value = 'Updated App Name';
      input.dispatchEvent(new CustomEvent('ionBlur'));
    }
    await root.updateComplete;

    const saveButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const putReq = requests.find(r => r.url.match(/\/app\/configuration$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = (await putReq?.clone().json()) as AppConfiguration;
    expect(body.title).toBe('Updated App Name');
    expect(appConfig.config.title).toBe('Updated App Name');
  });

  it('does not save configuration when form validity check fails', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockConfig));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const form = root.renderRoot.querySelector('form');
    expect(form).not.toBeNull();
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

  it('displays toast error when saving configuration fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    const toast = mockToast();
    const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'PUT') {
        return Promise.resolve({ status: 500, body: 'Server error' });
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    const saveButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    expect(createToastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to save configuration.' })
    );
    expect(toast.present).toHaveBeenCalled();
  });

  it('reloads configuration when reset button is clicked', async () => {
    let getCount = 0;
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        getCount++;
        if (getCount === 1) {
          return Promise.resolve(JSON.stringify({ title: 'First Load' }));
        }
        return Promise.resolve(JSON.stringify({ title: 'Reset Value' }));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    let input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.value).toBe('First Load');

    const resetButton = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
    resetButton?.click();
    await new Promise(r => setTimeout(r, 10));
    await root.updateComplete;

    input = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.value).toBe('Reset Value');
    expect(getCount).toBeGreaterThanOrEqual(2);
  });
});
