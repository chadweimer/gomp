import { describe, it, expect } from '@stencil/vitest';
import { sanitizeHTML, toPresentationHtml, toStorageHtml } from './utils';

describe('utils', () => {
  describe('sanitizeHTML', () => {
    it('preserves target and data-image attributes on allowed tags', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a><img src="thumb.jpg" data-image="foo.jpg">';
      const output = sanitizeHTML(input);
      expect(output).toContain('target="_blank"');
      expect(output).toContain('data-image="foo.jpg"');
    });

    it('preserves safe style properties and span tags while stripping dangerous ones', () => {
      const input = '<div style="margin: 10px; position: fixed; background: url(javascript:alert(1));"><span style="display: block;">text</span></div>';
      const output = sanitizeHTML(input);
      expect(output).toContain('margin: 10px');
      expect(output).toContain('display: block');
      expect(output).toContain('<span');
      expect(output).not.toContain('position');
      expect(output).not.toContain('javascript');
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

    it('replaces image elements with width attribute with extended sentinels', () => {
      const input = '<img src="/thumbs/pancakes.jpg" alt="pancakes.jpg" data-image="pancakes.jpg" data-width="300">';
      const output = toStorageHtml(globalThis.document.body, input);
      expect(output).toEqualHtml('{{image:pancakes.jpg|width=300}}');
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

    it('round-trips with toPresentationHtml with height attribute', () => {
      const original = 'Step 1: Mix. {{image:pancakes.jpg|height=300px}} Step 2: Cook.';
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
        'Step 1: Mix. <a href="/uploads/recipes/42/images/pancakes.jpg" target="_blank" rel="noopener noreferrer"><img src="/uploads/recipes/42/images/pancakes.jpg" alt="pancakes.jpg" data-image="pancakes.jpg" style="max-width: 400px; max-height: 400px"></a> Step 2: Cook.',
      );
    });

    it('replaces image sentinels with plain thumbnail images when makeClickable is false', () => {
      const directions = 'Step 1: Mix. {{image:pancakes.jpg}} Step 2: Cook.';
      const output = toPresentationHtml(globalThis.document.body, directions, 42, false);
      expect(output).toEqualHtml(
        'Step 1: Mix. <img src="/uploads/recipes/42/images/pancakes.jpg" alt="pancakes.jpg" data-image="pancakes.jpg" style="max-width: 400px; max-height: 400px"> Step 2: Cook.',
      );
    });

    it('handles multiple image sentinels', () => {
      const directions = '{{image:first.png}} then {{image:second.png}}';
      const output = toPresentationHtml(globalThis.document.body, directions, 10, false);
      expect(output).toEqualHtml(
        '<img src="/uploads/recipes/10/images/first.png" alt="first.png" data-image="first.png" style="max-width: 400px; max-height: 400px"> then <img src="/uploads/recipes/10/images/second.png" alt="second.png" data-image="second.png" style="max-width: 400px; max-height: 400px">',
      );
    });
  });
});
