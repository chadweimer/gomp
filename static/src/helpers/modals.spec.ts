import { AlertButton, alertController } from '@ionic/core';
import { describe, it, expect, afterEach } from '@stencil/vitest';
import { vi, beforeAll, beforeEach } from 'vitest';
import { configureModalCanDismiss, performAutofocus, showResultsPerPageAlert } from './modals';

describe('modals', () => {
  describe('showResultsPerPageAlert', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates alert with default options and marks currentValue as checked', async () => {
      const presentMock = vi.fn().mockResolvedValue(undefined);
      const alert = {
        present: presentMock,
        dismiss: vi.fn().mockResolvedValue(true),
        onDidDismiss: vi.fn().mockResolvedValue({ data: { values: 96 }, role: 'confirm' })
      } as unknown as HTMLIonAlertElement;
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(alert);

      const onSelect = vi.fn();
      await showResultsPerPageAlert(60, onSelect);

      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Results Per Page' }),
      );
      expect(presentMock).toHaveBeenCalled();

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.inputs).toHaveLength(5);
      expect(alertOptions.inputs?.[0].value).toBe(24);
      expect(alertOptions.inputs?.[0].checked).toBe(false);
      expect(alertOptions.inputs?.[2].value).toBe(60);
      expect(alertOptions.inputs?.[2].checked).toBe(true);

      const cancelButton = alertOptions.buttons?.find(b => typeof b === 'object' && b.text === 'Cancel') as AlertButton;
      expect(cancelButton).toBeDefined();
      expect(cancelButton.role).toBe('cancel');

      const okButton = alertOptions.buttons?.find(b => typeof b === 'object' && b.text === 'OK') as AlertButton;
      expect(okButton).toBeDefined();

      await alert.dismiss();

      expect(onSelect).toHaveBeenCalledWith(96);
    });

    it('uses custom options when provided', async () => {
      const presentMock = vi.fn().mockResolvedValue(undefined);
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue({
        present: presentMock,
        onDidDismiss: vi.fn().mockResolvedValue(true)
      } as unknown as HTMLIonAlertElement);

      const onSelect = vi.fn();
      await showResultsPerPageAlert(10, onSelect, [10, 20, 50]);

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.inputs).toHaveLength(3);
      expect(alertOptions.inputs?.[0].value).toBe(10);
      expect(alertOptions.inputs?.[0].checked).toBe(true);
      expect(alertOptions.inputs?.[1].value).toBe(20);
      expect(alertOptions.inputs?.[1].checked).toBe(false);
      expect(alertOptions.inputs?.[2].value).toBe(50);
      expect(alertOptions.inputs?.[2].checked).toBe(false);
    });
  });

  describe('performAutofocus', () => {
    beforeAll(() => {
      const base = Object.getPrototypeOf(HTMLElement) as unknown;
      if (typeof base === 'function' && !(document.createElement('div') instanceof HTMLElement)) {
        Object.defineProperty(HTMLElement, Symbol.hasInstance, {
          value: (instance: unknown) => instance instanceof (base as new (...args: unknown[]) => HTMLElement),
          configurable: true,
        });
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('focuses element with [autofocus] in shadow DOM when component is an HTMLElement', () => {
      const modal = document.createElement('ion-modal') as unknown as HTMLIonModalElement;
      const removeEventListenerSpy = vi.spyOn(modal, 'removeEventListener');

      const component = document.createElement('div');
      const shadowRoot = component.attachShadow({ mode: 'open' });
      const input = document.createElement('input');
      input.setAttribute('autofocus', '');
      shadowRoot.appendChild(input);
      const focusSpy = vi.spyOn(input, 'focus');

      modal.component = component;
      performAutofocus.call(modal);

      expect(focusSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', performAutofocus);
    });

    it('focuses element with [autofocus] in light DOM when component is a string selector', () => {
      const modal = document.createElement('ion-modal') as unknown as HTMLIonModalElement;
      const removeEventListenerSpy = vi.spyOn(modal, 'removeEventListener');

      const component = document.createElement('div');
      component.className = 'custom-dialog';
      const input = document.createElement('input');
      input.setAttribute('autofocus', '');
      component.appendChild(input);
      modal.appendChild(component);
      const focusSpy = vi.spyOn(input, 'focus');

      modal.component = '.custom-dialog';
      performAutofocus.call(modal);

      expect(focusSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', performAutofocus);
    });

    it('falls back to focusing the component itself when no autofocus element exists', () => {
      const modal = document.createElement('ion-modal') as unknown as HTMLIonModalElement;
      const removeEventListenerSpy = vi.spyOn(modal, 'removeEventListener');

      const component = document.createElement('button');
      const focusSpy = vi.spyOn(component, 'focus');

      modal.component = component;
      performAutofocus.call(modal);

      expect(focusSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', performAutofocus);
    });

    it('handles missing component when string selector does not match', () => {
      const modal = document.createElement('ion-modal') as unknown as HTMLIonModalElement;
      const removeEventListenerSpy = vi.spyOn(modal, 'removeEventListener');

      modal.component = 'non-existent-tag';
      performAutofocus.call(modal);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', performAutofocus);
    });

    it('handles undefined component gracefully', () => {
      const modal = document.createElement('ion-modal') as unknown as HTMLIonModalElement;
      const removeEventListenerSpy = vi.spyOn(modal, 'removeEventListener');

      modal.component = undefined as unknown as string;
      performAutofocus.call(modal);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', performAutofocus);
    });
  });

  describe('configureModalCanDismiss', () => {
    let modal: HTMLIonModalElement;

    function mockAlert(role = 'cancel'): HTMLIonAlertElement {
      return {
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(true),
        onDidDismiss: vi.fn().mockResolvedValue({ role }),
      } as unknown as HTMLIonAlertElement;
    }

    async function callCanDismiss(
      targetModal: HTMLIonModalElement,
      data?: unknown,
      role?: string,
    ): Promise<boolean | undefined> {
      if (typeof targetModal.canDismiss === 'function') {
        return await targetModal.canDismiss(data, role);
      }
      return targetModal.canDismiss;
    }

    beforeEach(() => {
      modal = document.createElement('ion-modal') as unknown as HTMLIonModalElement;
    });

    afterEach(() => {
      modal.remove();
      vi.restoreAllMocks();
    });

    it('checks isDirty when presentingElement is attached to DOM', async () => {
      document.body.appendChild(modal);
      const presentingEl = document.createElement('div');
      document.body.appendChild(presentingEl);
      try {
        modal.presentingElement = presentingEl;

        const isDirty = vi.fn().mockReturnValue(false);
        configureModalCanDismiss(modal, isDirty);

        const canDismiss = await callCanDismiss(modal, undefined, 'cancel');

        expect(canDismiss).toBe(true);
        expect(isDirty).toHaveBeenCalledWith(undefined, 'cancel');
      } finally {
        presentingEl.remove();
      }
    });

    it('returns true without showing an alert when isDirty returns false synchronously', async () => {
      document.body.appendChild(modal);
      const createAlertSpy = vi.spyOn(alertController, 'create');

      const isDirty = vi.fn().mockReturnValue(false);
      configureModalCanDismiss(modal, isDirty);

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');

      expect(canDismiss).toBe(true);
      expect(isDirty).toHaveBeenCalledWith(undefined, 'cancel');
      expect(createAlertSpy).not.toHaveBeenCalled();
    });

    it('returns true without showing an alert when isDirty resolves to false asynchronously', async () => {
      document.body.appendChild(modal);
      const createAlertSpy = vi.spyOn(alertController, 'create');

      const isDirty = vi.fn().mockResolvedValue(false);
      configureModalCanDismiss(modal, isDirty);

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');

      expect(canDismiss).toBe(true);
      expect(isDirty).toHaveBeenCalledWith(undefined, 'cancel');
      expect(createAlertSpy).not.toHaveBeenCalled();
    });

    it('checks isDirty when role is undefined and returns true if clean', async () => {
      document.body.appendChild(modal);

      const isDirty = vi.fn().mockReturnValue(false);
      configureModalCanDismiss(modal, isDirty);

      const canDismiss = await callCanDismiss(modal, undefined, undefined);

      expect(canDismiss).toBe(true);
      expect(isDirty).toHaveBeenCalledWith(undefined, undefined);
    });

    it('shows discard alert and returns true when isDirty is true and user confirms discard', async () => {
      document.body.appendChild(modal);
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const isDirty = vi.fn().mockReturnValue(true);
      configureModalCanDismiss(modal, isDirty);

      const canDismiss = await callCanDismiss(modal, { draft: 1 }, 'cancel');

      expect(isDirty).toHaveBeenCalledWith({ draft: 1 }, 'cancel');
      expect(createAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Discard Changes?',
          message: 'You have unsaved changes. Are you sure you want to discard them?',
          buttons: [
            { text: 'Continue Editing', role: 'cancel' },
            { text: 'Discard Changes', role: 'destructive' },
          ],
        }),
      );
      expect(canDismiss).toBe(true);
    });

    it('shows discard alert and returns false when isDirty resolves to true and user cancels', async () => {
      document.body.appendChild(modal);
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const isDirty = vi.fn().mockResolvedValue(true);
      configureModalCanDismiss(modal, isDirty);

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');

      expect(isDirty).toHaveBeenCalledWith(undefined, 'cancel');
      expect(createAlertSpy).toHaveBeenCalledTimes(1);
      expect(canDismiss).toBe(false);
    });

    it('catches synchronous exception thrown by isDirty, logs error, and returns true', async () => {
      document.body.appendChild(modal);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const isDirty = vi.fn().mockImplementation(() => {
        throw new Error('isDirty sync error');
      });
      configureModalCanDismiss(modal, isDirty);

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(canDismiss).toBe(true);
    });

    it('catches asynchronous rejection from isDirty, logs error, and returns true', async () => {
      document.body.appendChild(modal);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const isDirty = vi.fn().mockRejectedValue(new Error('isDirty async error'));
      configureModalCanDismiss(modal, isDirty);

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(canDismiss).toBe(true);
    });

    it('gracefully handles a null modal', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const isDirty = vi.fn();
      expect(() => configureModalCanDismiss(undefined, isDirty)).not.toThrow();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('gracefully handles an undefined modal', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const isDirty = vi.fn();
      expect(() => configureModalCanDismiss(undefined, isDirty)).not.toThrow();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
