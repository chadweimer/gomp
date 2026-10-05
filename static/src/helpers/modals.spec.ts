import { AlertButton, alertController } from '@ionic/core';
import { describe, it, expect, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
import { showResultsPerPageAlert } from './modals';

describe('modals', () => {
  describe('showResultsPerPageAlert', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates alert with default options and marks currentValue as checked', async () => {
      const presentMock = vi.fn().mockResolvedValue(undefined);
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue({
        present: presentMock,
      } as unknown as HTMLIonAlertElement);

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

      const handler = okButton.handler as (val: number) => void;
      handler(96);
      expect(onSelect).toHaveBeenCalledWith(96);
    });

    it('uses custom options when provided', async () => {
      const presentMock = vi.fn().mockResolvedValue(undefined);
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue({
        present: presentMock,
      } as unknown as HTMLIonAlertElement);

      const onSelect = vi.fn();
      await showResultsPerPageAlert(10, onSelect, [10, 20, 50]);

      const alertOptions = createAlertSpy.mock.calls[0][0];
      expect(alertOptions.inputs).toHaveLength(3);
      expect(alertOptions.inputs?.[0].value).toBe(10);
      expect(alertOptions.inputs?.[0].checked).toBe(true);
      expect(alertOptions.inputs?.[1].value).toBe(20);
      expect(alertOptions.inputs?.[1].checked).toBe(false);
    });
  });
});
