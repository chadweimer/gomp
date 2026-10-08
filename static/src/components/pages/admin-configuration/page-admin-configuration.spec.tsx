import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AppConfiguration } from '../../../helpers/schema.gen';
import appConfig from '../../../stores/config';
import { clearState } from '../../../stores/state';
import './page-admin-configuration';

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
    localStorage.clear();
    sessionStorage.clear();
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
    const { root } = await render(<page-admin-configuration />);
    expect(root).toHaveClass('hydrated');

    const input = root.querySelector('ion-input');
    expect(input).not.toBeNull();
    expect(input).toEqualAttribute('label', 'Application Title');
    expect(input).toEqualAttribute('value', 'GOMP: Go Meal Planner');

    const buttons = root.querySelectorAll('ion-button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toEqualText('Save');
    expect(buttons[1]).toEqualText('Reset');
  });

  it('loads configuration on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockConfig) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminConfigurationElement>(<page-admin-configuration />);
    await root.activatedCallback();
    await waitForChanges();

    const input = root.querySelector('ion-input');
    expect(input).toEqualAttribute('value', 'Custom Meal Planner');
  });

  it('handles GET configuration failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminConfigurationElement>(<page-admin-configuration />);
    await root.activatedCallback();
    await waitForChanges();

    expect(consoleErrorSpy).toHaveBeenCalled();
    const input = root.querySelector('ion-input');
    expect(input).toEqualAttribute('value', 'GOMP: Go Meal Planner');
  });

  it('updates configuration on input blur and saves on save button click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockConfig) };
      }
      if (req.url.match(/\/app\/configuration$/) && req.method === 'PUT') {
        return { status: 200, body: '' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminConfigurationElement>(<page-admin-configuration />);
    await root.activatedCallback();
    await waitForChanges();

    const input = root.querySelector<HTMLIonInputElement>('ion-input');
    expect(input).not.toBeNull();
    if (input) {
      input.value = 'Updated App Name';
      input.dispatchEvent(new CustomEvent('ionBlur'));
    }
    await waitForChanges();

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

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
        return { status: 200, body: JSON.stringify(mockConfig) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminConfigurationElement>(<page-admin-configuration />);
    await root.activatedCallback();
    await waitForChanges();

    const form = root.querySelector('form');
    expect(form).not.toBeNull();
    if (form) {
      vi.spyOn(form, 'reportValidity').mockReturnValue(false);
    }

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

    const putRequests = requests.filter(r => r.method === 'PUT');
    expect(putRequests).toHaveLength(0);
  });

  it('displays toast error when saving configuration fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    const toast = mockToast();
    const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'PUT') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminConfigurationElement>(<page-admin-configuration />);

    const saveButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveButton?.click();
    await waitForChanges();

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
          return { status: 200, body: JSON.stringify({ title: 'First Load' }) };
        }
        return { status: 200, body: JSON.stringify({ title: 'Reset Value' }) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageAdminConfigurationElement>(<page-admin-configuration />);
    await root.activatedCallback();
    await waitForChanges();

    let input = root.querySelector('ion-input');
    expect(input).toEqualAttribute('value', 'First Load');

    const resetButton = root.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
    resetButton?.click();
    await waitForChanges();

    input = root.querySelector('ion-input');
    expect(input).toEqualAttribute('value', 'Reset Value');
    expect(getCount).toBe(2);
  });
});
