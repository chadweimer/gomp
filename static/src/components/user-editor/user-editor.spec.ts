import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController } from '@ionic/core';
import { AccessLevel, User } from '../../helpers/schema.gen';
import './user-editor';
import { UserEditor } from './user-editor';

describe('user-editor', () => {
  let modalEl: HTMLIonModalElement;

  function mockAlert(role = 'destructive'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  function syncInputs(root: UserEditor) {
    const usernameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    if (usernameInput) {
      usernameInput.value = root.user?.username ?? '';
    }
    const passwordInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Password"]');
    if (passwordInput) {
      passwordInput.value = '';
    }
    const repeatPasswordInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
    if (repeatPasswordInput) {
      repeatPasswordInput.value = '';
    }
  }

  async function callCanDismiss(
    modal: HTMLIonModalElement,
    data?: unknown,
    role?: string
  ): Promise<boolean | undefined> {
    if (typeof modal.canDismiss === 'function') {
      return await modal.canDismiss(data, role);
    }
    return modal.canDismiss;
  }

  beforeEach(() => {
    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);
  });

  afterEach(() => {
    modalEl.remove();
    vi.restoreAllMocks();
  });

  it('builds', async () => {
    const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
    expect(root).toBeDefined();
  });

  it('defaults for new user', async () => {
    const expectedUser: User = {
      username: '',
      accessLevel: AccessLevel.Editor,
    };
    const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
    expect(root.user).toEqual(expectedUser);

    const title = root.renderRoot.querySelector('ion-title');
    expect(title?.textContent).toBe('New User');

    const usernameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput?.value).toEqual('');

    const accessLevelSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect?.value).toEqual(AccessLevel.Editor);

    const passwordInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Password"]');
    expect(passwordInput).not.toBeNull();

    const repeatPasswordInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
    expect(repeatPasswordInput).not.toBeNull();
  });

  it('binds to existing user and disables email', async () => {
    const user: User = {
      id: 1,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Admin,
    };
    const root = await fixture<UserEditor>(html`<user-editor .user=${user}></user-editor>`);
    expect(root.user).toEqual(user);

    const title = root.renderRoot.querySelector('ion-title');
    expect(title?.textContent).toBe('Edit User');

    const usernameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput?.value).toEqual(user.username);
    expect(usernameInput?.hasAttribute('disabled')).toBe(true);

    const accessLevelSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect?.value).toEqual(user.accessLevel);

    const passwordInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="password"]');
    expect(passwordInput).toBeNull();
  });

  describe('canDismiss guard', () => {
    it('allows dismissal without alert when role is save', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);

      const canDismiss = await callCanDismiss(modalEl, undefined, 'save');
      expect(canDismiss).toBe(true);
    });

    it('allows dismissal when form is clean', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);
      syncInputs(root);

      const alertSpy = vi.spyOn(alertController, 'create');

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('prompts to discard when username input changed', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);
      syncInputs(root);

      const usernameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
      if (usernameInput) {
        usernameInput.value = 'changed@example.com';
      }

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('prompts to discard when password entered', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);
      syncInputs(root);

      const passwordInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Password"]');
      if (passwordInput) {
        passwordInput.value = 'secret123';
      }

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('blocks dismissal when user cancels discard prompt', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);
      syncInputs(root);

      const passwordInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Password"]');
      if (passwordInput) {
        passwordInput.value = 'secret123';
      }

      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(false);
    });
  });

  describe('input events and user modifications', () => {
    it('updates user username on ionChange', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      const usernameInput = root.renderRoot.querySelector('ion-input[type="email"]');

      usernameInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'user@example.com' } }));
      await root.updateComplete;

      expect(root.user.username).toBe('user@example.com');
    });

    it('updates user accessLevel on ionChange', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      const select = root.renderRoot.querySelector('ion-select');

      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: AccessLevel.Admin } }));
      await root.updateComplete;

      expect(root.user.accessLevel).toBe(AccessLevel.Admin);
    });
  });

  describe('save and cancel actions', () => {
    it('sets validation error when passwords do not match for new user', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const repeatInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
      if (repeatInput) {
        repeatInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
      }

      const passwordInput = root.renderRoot.querySelector('ion-input[label="Password"]');
      passwordInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'pass123' } }));
      repeatInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'pass456' } }));
      await root.updateComplete;

      const form = root.renderRoot.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await root.updateComplete;

      expect(setCustomValiditySpy).toHaveBeenCalledWith('Passwords must match');
      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });

    it('dismisses with user and password when passwords match for new user', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const usernameInput = root.renderRoot.querySelector('ion-input[type="email"]');
      usernameInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'newuser@example.com' } }));

      const passwordInput = root.renderRoot.querySelector('ion-input[label="Password"]');
      const repeatInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
      if (repeatInput) {
        repeatInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
      }

      passwordInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'password123' } }));
      repeatInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'password123' } }));
      await root.updateComplete;

      const form = root.renderRoot.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(true);
      }

      const saveBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await root.updateComplete;

      expect(setCustomValiditySpy).toHaveBeenCalledWith('');
      expect(modalEl.dismiss).toHaveBeenCalledWith({
        user: { username: 'newuser@example.com', accessLevel: AccessLevel.Editor },
        password: 'password123'
      }, 'save');
    });

    it('dismisses with user on save for existing user', async () => {
      const existingUser: User = {
        id: 42,
        username: 'existing@example.com',
        accessLevel: AccessLevel.Viewer
      };
      const root = await fixture<UserEditor>(html`<user-editor .user=${existingUser}></user-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;

      const select = root.renderRoot.querySelector('ion-select');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: AccessLevel.Editor } }));
      await root.updateComplete;

      const saveBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await root.updateComplete;

      expect(modalEl.dismiss).toHaveBeenCalledWith({
        user: { id: 42, username: 'existing@example.com', accessLevel: AccessLevel.Editor }
      }, 'save');
    });

    it('dismisses with undefined and cancel role on cancel click', async () => {
      const root = await fixture<UserEditor>(html`<user-editor></user-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;

      const cancelBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
      cancelBtn?.click();
      await root.updateComplete;

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });
  });
});
