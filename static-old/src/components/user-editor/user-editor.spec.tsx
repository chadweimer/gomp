import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { alertController } from '@ionic/core';
import { AccessLevel, User } from '../../helpers/schema.gen';
import './user-editor';

describe('user-editor', () => {
  let modalEl: HTMLIonModalElement;

  function mockAlert(role = 'destructive'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  function syncInputs(root: HTMLUserEditorElement) {
    const usernameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type="email"]');
    if (usernameInput) {
      usernameInput.value = root.user?.username ?? '';
    }
    const passwordInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Password"]');
    if (passwordInput) {
      passwordInput.value = '';
    }
    const repeatPasswordInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
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
    const { root } = await render(<user-editor />);
    expect(root).toHaveClass('hydrated');
  });

  it('defaults for new user', async () => {
    const expectedUser: User = {
      username: '',
      accessLevel: AccessLevel.Editor,
    };
    const { root } = await render<HTMLUserEditorElement>(<user-editor />);
    expect(root.user).toEqual(expectedUser);

    const title = root.shadowRoot?.querySelector('ion-title');
    expect(title).toHaveTextContent('New User');

    const usernameInput = root.shadowRoot?.querySelector('ion-input[type=\'email\']');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput).toEqualAttribute('value', '');

    const accessLevelSelect = root.shadowRoot?.querySelector('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect).toEqualAttribute('value', AccessLevel.Editor);

    const passwordInput = root.shadowRoot?.querySelector('ion-input[label="Password"]');
    expect(passwordInput).not.toBeNull();

    const repeatPasswordInput = root.shadowRoot?.querySelector('ion-input[label="Confirm Password"]');
    expect(repeatPasswordInput).not.toBeNull();
  });

  it('binds to existing user and disables email', async () => {
    const user: User = {
      id: 1,
      username: 'someone@example.com',
      accessLevel: AccessLevel.Admin,
    };
    const { root } = await render(<user-editor user={user} />);
    expect(root).toHaveProperty('user', user);

    const title = root.shadowRoot?.querySelector('ion-title');
    expect(title).toHaveTextContent('Edit User');

    const usernameInput = root.shadowRoot?.querySelector('ion-input[type=\'email\']');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput).toEqualAttribute('value', user.username);
    expect(usernameInput).toHaveAttribute('disabled');

    const accessLevelSelect = root.shadowRoot?.querySelector('ion-select');
    expect(accessLevelSelect).not.toBeNull();
    expect(accessLevelSelect).toEqualAttribute('value', user.accessLevel);

    const passwordInput = root.shadowRoot?.querySelector('ion-input[type=\'password\']');
    expect(passwordInput).toBeNull();
  });

  describe('canDismiss guard', () => {
    it('allows dismissal without alert when role is save', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const canDismiss = await callCanDismiss(modalEl, undefined, 'save');
      expect(canDismiss).toBe(true);
    });

    it('allows dismissal when form is clean', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputs(root);

      const alertSpy = vi.spyOn(alertController, 'create');

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('prompts to discard when username input changed', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputs(root);

      const usernameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[type=\'email\']');
      if (usernameInput) {
        usernameInput.value = 'changed@example.com';
      }

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('prompts to discard when password entered', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputs(root);

      const passwordInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Password"]');
      if (passwordInput) {
        passwordInput.value = 'secret123';
      }

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('blocks dismissal when user cancels discard prompt', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputs(root);

      const passwordInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Password"]');
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
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      const usernameInput = root.shadowRoot?.querySelector('ion-input[type=\'email\']');

      usernameInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'user@example.com' } }));
      await waitForChanges();

      expect(root.user.username).toBe('user@example.com');
    });

    it('updates user accessLevel on ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      const select = root.shadowRoot?.querySelector('ion-select');

      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: AccessLevel.Admin } }));
      await waitForChanges();

      expect(root.user.accessLevel).toBe(AccessLevel.Admin);
    });
  });

  describe('save and cancel actions', () => {
    it('sets validation error when passwords do not match for new user', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const repeatInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
      if (repeatInput) {
        repeatInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
      }

      const passwordInput = root.shadowRoot?.querySelector('ion-input[label="Password"]');
      passwordInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'pass123' } }));
      repeatInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'pass456' } }));
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await waitForChanges();

      expect(setCustomValiditySpy).toHaveBeenCalledWith('Passwords must match');
      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });

    it('dismisses with user and password when passwords match for new user', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const nativeInput = document.createElement('input');
      const setCustomValiditySpy = vi.spyOn(nativeInput, 'setCustomValidity');

      const usernameInput = root.shadowRoot?.querySelector('ion-input[type=\'email\']');
      usernameInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'newuser@example.com' } }));

      const passwordInput = root.shadowRoot?.querySelector('ion-input[label="Password"]');
      passwordInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'validPassword' } }));

      const repeatInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Confirm Password"]');
      if (repeatInput) {
        repeatInput.getInputElement = vi.fn().mockResolvedValue(nativeInput);
      }
      repeatInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'validPassword' } }));
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(true);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await waitForChanges();

      expect(setCustomValiditySpy).toHaveBeenCalledWith('');
      expect(modalEl.dismiss).toHaveBeenCalledWith(
        {
          user: {
            username: 'newuser@example.com',
            accessLevel: AccessLevel.Editor,
          },
          password: 'validPassword',
        },
        'save'
      );
    });

    it('dismisses with updated user for existing user on save', async () => {
      const existingUser: User = {
        id: 42,
        username: 'existing@example.com',
        accessLevel: AccessLevel.Viewer,
      };
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor user={existingUser} />);
      modalEl.appendChild(root);
      await waitForChanges();

      const select = root.shadowRoot?.querySelector('ion-select');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: AccessLevel.Editor } }));
      await waitForChanges();

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="primary"] ion-button');
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith(
        {
          user: {
            id: 42,
            username: 'existing@example.com',
            accessLevel: AccessLevel.Editor,
          },
        },
        'save'
      );
    });

    it('dismisses modal with cancel role when Cancel is clicked', async () => {
      const { root, waitForChanges } = await render<HTMLUserEditorElement>(<user-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const cancelBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button');
      cancelBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });
  });
});
