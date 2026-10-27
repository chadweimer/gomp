import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { toastController } from '@ionic/core';
import { fetchMocker } from '../../../../vitest.setup';
import { AccessLevel, User } from '../../../helpers/schema.gen';
import { clearState } from '../../../stores/state';
import './page-settings-security';

describe('page-settings-security', () => {
  const originalFetch = globalThis.fetch;

  const mockUser: User = {
    id: 1,
    username: 'alice@example.com',
    accessLevel: AccessLevel.Editor,
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
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    vi.restoreAllMocks();
  });

  it('builds and renders initial state before activation', async () => {
    const { root } = await render(<page-settings-security />);
    expect(root).toHaveClass('hydrated');

    const inputs = root.querySelectorAll('ion-input');
    expect(inputs).toHaveLength(5);

    const emailInput = inputs[0];
    expect(emailInput).toEqualAttribute('label', 'Email');
    expect(emailInput).toHaveAttribute('disabled');

    const accessInput = inputs[1];
    expect(accessInput).toEqualAttribute('label', 'Access Level');
    expect(accessInput).toHaveAttribute('disabled');

    const updateButton = root.querySelector('ion-button');
    expect(updateButton).not.toBeNull();
    expect(updateButton).toEqualText('Update Password');
  });

  it('loads and renders current user on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
        return { status: 200, body: JSON.stringify(mockUser) };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsSecurityElement>(<page-settings-security />);
    await root.activatedCallback();
    await waitForChanges();

    const inputs = root.querySelectorAll('ion-input');
    expect(inputs[0]).toEqualAttribute('value', 'alice@example.com');
    expect(inputs[1]).toEqualAttribute('value', 'Editor');
  });

  it('handles GET current user failure gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
        return { status: 500, body: 'Server error' };
      }
      return { status: 404, body: '' };
    });

    const { root, waitForChanges } = await render<HTMLPageSettingsSecurityElement>(<page-settings-security />);
    await root.activatedCallback();
    await waitForChanges();

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  describe('Password Validation & Update', () => {
    it('sets custom validity when new password and confirm password do not match', async () => {
      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUser) };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSecurityElement>(<page-settings-security />);
      await root.activatedCallback();
      await waitForChanges();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const inputs = root.querySelectorAll<HTMLIonInputElement>('ion-input');
      const currentPasswordInput = inputs[2];
      const newPasswordInput = inputs[3];
      const repeatPasswordInput = inputs[4];

      repeatPasswordInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);

      currentPasswordInput.value = 'oldPassword';
      currentPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));

      newPasswordInput.value = 'newPassword123';
      newPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));

      repeatPasswordInput.value = 'mismatchPassword';
      repeatPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));
      await waitForChanges();

      const form = root.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const updateBtn = root.querySelector<HTMLIonButtonElement>('ion-button');
      updateBtn?.click();
      await waitForChanges();

      expect(setCustomValiditySpy).toHaveBeenCalledWith('Passwords must match');

      const putRequests = requests.filter(r => r.method === 'PUT');
      expect(putRequests).toHaveLength(0);
    });

    it('successfully updates password when passwords match and form is valid', async () => {
      const requests: Request[] = [];
      fetchMocker.mockResponse((req: Request) => {
        requests.push(req);
        if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUser) };
        }
        if (req.url.match(/\/users\/current\/password$/) && req.method === 'PUT') {
          return { status: 200, body: '' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSecurityElement>(<page-settings-security />);
      await root.activatedCallback();
      await waitForChanges();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const inputs = root.querySelectorAll<HTMLIonInputElement>('ion-input');
      const currentPasswordInput = inputs[2];
      const newPasswordInput = inputs[3];
      const repeatPasswordInput = inputs[4];

      repeatPasswordInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);

      currentPasswordInput.value = 'currentSecret1';
      currentPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));

      newPasswordInput.value = 'brandNewSecret2';
      newPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));

      repeatPasswordInput.value = 'brandNewSecret2';
      repeatPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));
      await waitForChanges();

      const updateBtn = root.querySelector<HTMLIonButtonElement>('ion-button');
      updateBtn?.click();
      await waitForChanges();

      expect(setCustomValiditySpy).toHaveBeenCalledWith('');

      const putReq = requests.find(r => r.url.match(/\/users\/current\/password$/) && r.method === 'PUT');
      expect(putReq).toBeDefined();
      const body = (await putReq?.clone().json()) as { currentPassword: string, newPassword: string };
      expect(body.currentPassword).toBe('currentSecret1');
      expect(body.newPassword).toBe('brandNewSecret2');

      // Password fields should be cleared after update
      expect(currentPasswordInput).toEqualAttribute('value', '');
      expect(newPasswordInput).toEqualAttribute('value', '');
      expect(repeatPasswordInput).toEqualAttribute('value', '');
    });

    it('displays toast error when password update fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => { });
      const toast = mockToast();
      const createToastSpy = vi.spyOn(toastController, 'create').mockResolvedValue(toast);

      fetchMocker.mockResponse((req: Request) => {
        if (req.url.match(/\/users\/current$/) && req.method === 'GET') {
          return { status: 200, body: JSON.stringify(mockUser) };
        }
        if (req.url.match(/\/users\/current\/password$/) && req.method === 'PUT') {
          return { status: 400, body: 'Bad current password' };
        }
        return { status: 404, body: '' };
      });

      const { root, waitForChanges } = await render<HTMLPageSettingsSecurityElement>(<page-settings-security />);
      await root.activatedCallback();
      await waitForChanges();

      const nativeInput = document.createElement('input');
      const inputs = root.querySelectorAll<HTMLIonInputElement>('ion-input');
      const currentPasswordInput = inputs[2];
      const newPasswordInput = inputs[3];
      const repeatPasswordInput = inputs[4];

      repeatPasswordInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);

      currentPasswordInput.value = 'wrongOld';
      currentPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));

      newPasswordInput.value = 'newSecret';
      newPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));

      repeatPasswordInput.value = 'newSecret';
      repeatPasswordInput.dispatchEvent(new CustomEvent('ionBlur'));
      await waitForChanges();

      const updateBtn = root.querySelector<HTMLIonButtonElement>('ion-button');
      updateBtn?.click();
      await waitForChanges();

      expect(createToastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to update password.' })
      );
      expect(toast.present).toHaveBeenCalled();
    });
  });
});
