import { describe, it, expect } from '@stencil/vitest';
import { formatRecipeDirections, sanitizeHTML } from '../utils';

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

  describe('formatRecipeDirections', () => {
    it('returns empty string for null or empty directions', () => {
      expect(formatRecipeDirections(null, 1)).toBe('');
      expect(formatRecipeDirections('', 1)).toBe('');
      expect(formatRecipeDirections(undefined, 1)).toBe('');
    });

    it('replaces image sentinels with clickable thumbnail images by default', () => {
      const directions = 'Step 1: Mix. {{image:pancakes.jpg}} Step 2: Cook.';
      const output = formatRecipeDirections(directions, 42);
      expect(output).toBe(
        'Step 1: Mix. <a href="/uploads/recipes/42/images/pancakes.jpg" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="/uploads/recipes/42/thumbs/pancakes.jpg" alt="pancakes.jpg"></a> Step 2: Cook.',
      );
    });

    it('replaces image sentinels with plain thumbnail images when makeClickable is false', () => {
      const directions = 'Step 1: Mix. {{image:pancakes.jpg}} Step 2: Cook.';
      const output = formatRecipeDirections(directions, 42, false);
      expect(output).toBe(
        'Step 1: Mix. <img loading="lazy" src="/uploads/recipes/42/thumbs/pancakes.jpg" alt="pancakes.jpg"> Step 2: Cook.',
      );
    });

    it('handles multiple image sentinels', () => {
      const directions = '{{image:first.png}} then {{image:second.png}}';
      const output = formatRecipeDirections(directions, 10, false);
      expect(output).toBe(
        '<img loading="lazy" src="/uploads/recipes/10/thumbs/first.png" alt="first.png"> then <img loading="lazy" src="/uploads/recipes/10/thumbs/second.png" alt="second.png">',
      );
    });
  });
});
