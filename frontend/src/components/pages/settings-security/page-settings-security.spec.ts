import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, User } from '../../../helpers/schema.gen';
import { clearState } from '../../../stores/state';
import './page-settings-security';
import { PageSettingsSecurity } from './page-settings-security';

describe('page-settings-security', () => {
  const originalFetch = globalThis.fetch;

  const mockUser: User = {
    id: 1,
    username: 'alice@example.com',
    accessLevel: AccessLevel.Editor,
  };

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

  it('builds and renders initial state', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockUser));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsSecurity>(html`<page-settings-security></page-settings-security>`);
    await root.updateComplete;

    const inputs = root.querySelectorAll('ion-input');
    expect(inputs).toHaveLength(5);

    const emailInput = inputs[0];
    expect(emailInput?.getAttribute('label')).toBe('Email');
    expect(emailInput?.hasAttribute('disabled')).toBe(true);

    const accessInput = inputs[1];
    expect(accessInput?.getAttribute('label')).toBe('Access Level');
    expect(accessInput?.hasAttribute('disabled')).toBe(true);

    const updateButton = root.querySelector('ion-button');
    expect(updateButton).not.toBeNull();
  });

  it('loads and renders current user on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockUser));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsSecurity>(html`<page-settings-security></page-settings-security>`);
    await root.activatedCallback();
    await root.updateComplete;

    const emailInput = root.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    expect(emailInput?.getAttribute('.value') ?? (emailInput as any).value).toBe('alice@example.com');
  });

  it('validates password match and updates password when valid', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockUser));
      }
      if (req.url.match(/\/users\/current\/password$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsSecurity>(html`<page-settings-security></page-settings-security>`);
    await root.activatedCallback();
    await root.updateComplete;

    const nativeInput = document.createElement('input');
    const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

    const repeatPasswordInput = root.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
    if (repeatPasswordInput) {
      repeatPasswordInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
    }

    root.currentPassword = 'oldpass';
    root.newPassword = 'newpass';
    root.repeatPassword = 'newpass';
    await root.updateComplete;

    await root.onUpdatePasswordClicked();
    await root.updateComplete;

    expect(setCustomValiditySpy).toHaveBeenCalledWith('');
    const putReq = requests.find(r => r.url.match(/\/users\/current\/password$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = await putReq?.clone().json();
    expect(body.currentPassword).toBe('oldpass');
    expect(body.newPassword).toBe('newpass');

    // Values should be reset
    expect(root.currentPassword).toBe('');
    expect(root.newPassword).toBe('');
    expect(root.repeatPassword).toBe('');
  });

  it('sets custom validity when passwords do not match', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockUser));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageSettingsSecurity>(html`<page-settings-security></page-settings-security>`);
    await root.activatedCallback();
    await root.updateComplete;

    const nativeInput = document.createElement('input');
    const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

    const repeatPasswordInput = root.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
    if (repeatPasswordInput) {
      repeatPasswordInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
    }

    const form = root.querySelector('form');
    if (form) {
      vi.spyOn(form, 'reportValidity').mockReturnValue(false);
    }

    root.currentPassword = 'oldpass';
    root.newPassword = 'newpass';
    root.repeatPassword = 'mismatched';
    await root.updateComplete;

    await root.onUpdatePasswordClicked();
    await root.updateComplete;

    expect(setCustomValiditySpy).toHaveBeenCalledWith('Passwords must match');
  });
});

