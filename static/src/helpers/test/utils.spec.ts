import { describe, it, expect, afterEach } from '@stencil/vitest';
import { vi } from 'vitest';
import { AlertButton, alertController } from '@ionic/core';
import { sanitizeHTML, showResultsPerPageAlert, toPresentationHtml, toStorageHtml } from '../utils';

describe('utils', () => {
  describe('sanitizeHTML', () => {
    it('preserves target and data-image attributes on allowed tags', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a><img src="thumb.jpg" data-image="foo.jpg">';
      const output = sanitizeHTML(input);
      expect(output).toContain('target="_blank"');
      expect(output).toContain('data-image="foo.jpg"');
    });

    it('strips forbidden style tags and attributes', () => {
      const input = '<div style="color: red;"><span style="font-weight: bold;">text</span></div>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('style');
      expect(output).not.toContain('<span');
    });
  });

  describe('toStorageHtml', () => {
    it('returns empty string for null, undefined, or empty input', () => {
      expect(toStorageHtml(globalThis.document.body, null)).toBe('');
      expect(toStorageHtml(globalThis.document.body, undefined)).toBe('');
      expect(toStorageHtml(globalThis.document.body, '')).toBe('');
    });

    it('returns original html when no images are present', () => {
      const input = '<p>Step 1: Mix ingredients.</p>';
      expect(toStorageHtml(globalThis.document.body, input)).toEqualHtml(input);
    });

    it('replaces image elements with data-image attribute with image sentinels', () => {
      const input = 'Step 1: Mix. <img src="/uploads/recipes/42/thumbs/pancakes.jpg" alt="pancakes.jpg" data-image="pancakes.jpg"> Step 2: Cook.';
      const output = toStorageHtml(globalThis.document.body, input);
      expect(output).toEqualHtml('Step 1: Mix. {{image:pancakes.jpg}} Step 2: Cook.');
    });

    it('replaces multiple image elements with their corresponding sentinels', () => {
      const input = '<img src="/thumbs/first.png" data-image="first.png"> then <img src="/thumbs/second.png" data-image="second.png">';
      const output = toStorageHtml(globalThis.document.body, input);
      expect(output).toEqualHtml('{{image:first.png}} then {{image:second.png}}');
    });

    it('leaves image elements without data-image attribute intact', () => {
      const input = '<p>Photo: <img src="https://example.com/external.png" alt="external"></p>';
      const output = toStorageHtml(globalThis.document.body, input);
      expect(output).toEqualHtml(input);
    });

    it('handles mixed images with and without data-image attributes', () => {
      const input = '<img src="/thumbs/local.png" data-image="local.png"><img src="https://example.com/external.png" alt="external">';
      const output = toStorageHtml(globalThis.document.body, input);
      expect(output).toEqualHtml('{{image:local.png}}<img src="https://example.com/external.png" alt="external">');
    });

    it('round-trips with toPresentationHtml when clickable is false', () => {
      const original = 'Step 1: Mix. {{image:pancakes.jpg}} Step 2: Cook.';
      const presentation = toPresentationHtml(globalThis.document.body, original, 42, false);
      const storage = toStorageHtml(globalThis.document.body, presentation);
      expect(storage).toEqualHtml(original);
    });
  });

  describe('toPresentationHtml', () => {
    it('returns empty string for null or empty directions', () => {
      expect(toPresentationHtml(globalThis.document.body, null, 1)).toBe('');
      expect(toPresentationHtml(globalThis.document.body, '', 1)).toBe('');
      expect(toPresentationHtml(globalThis.document.body, undefined, 1)).toBe('');
    });

    it('replaces image sentinels with clickable thumbnail images by default', () => {
      const directions = 'Step 1: Mix. {{image:pancakes.jpg}} Step 2: Cook.';
      const output = toPresentationHtml(globalThis.document.body, directions, 42);
      expect(output).toEqualHtml(
        'Step 1: Mix. <a href="/uploads/recipes/42/images/pancakes.jpg" target="_blank" rel="noopener noreferrer"><img src="/uploads/recipes/42/thumbs/pancakes.jpg" alt="pancakes.jpg" data-image="pancakes.jpg"></a> Step 2: Cook.',
      );
    });

    it('replaces image sentinels with plain thumbnail images when makeClickable is false', () => {
      const directions = 'Step 1: Mix. {{image:pancakes.jpg}} Step 2: Cook.';
      const output = toPresentationHtml(globalThis.document.body, directions, 42, false);
      expect(output).toEqualHtml(
        'Step 1: Mix. <img src="/uploads/recipes/42/thumbs/pancakes.jpg" alt="pancakes.jpg" data-image="pancakes.jpg"> Step 2: Cook.',
      );
    });

    it('handles multiple image sentinels', () => {
      const directions = '{{image:first.png}} then {{image:second.png}}';
      const output = toPresentationHtml(globalThis.document.body, directions, 10, false);
      expect(output).toEqualHtml(
        '<img src="/uploads/recipes/10/thumbs/first.png" alt="first.png" data-image="first.png"> then <img src="/uploads/recipes/10/thumbs/second.png" alt="second.png" data-image="second.png">',
      );
    });
  });

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
