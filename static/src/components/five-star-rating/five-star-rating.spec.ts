import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import './five-star-rating';
import { FiveStarRating } from './five-star-rating';
import { AppIcon } from '../app-icon/app-icon';

describe('five-star-rating', () => {
  it('renders empty stars by default', async () => {
    const el = await fixture<FiveStarRating>(html`<five-star-rating></five-star-rating>`);
    const icons = el.renderRoot.querySelectorAll<AppIcon>('app-icon');
    expect(icons).not.toBeNull();
    expect(icons).toHaveLength(5);
    icons?.forEach(icon => {
      expect(icon.getAttribute('name')).toBe('star');
      expect(icon.fill).toBe(false);
      expect(icon.classList).not.toContain('hover');
    });
  });

  it('renders value with whole, half, and outline stars', async () => {
    const el = await fixture<FiveStarRating>(html`<five-star-rating .value=${3.5}></five-star-rating>`);
    const icons = el.renderRoot.querySelectorAll<AppIcon>('app-icon');
    expect(icons).toHaveLength(5);

    icons?.forEach((icon, i) => {
      if (i <= 2) {
        expect(icon.getAttribute('name')).toBe('star');
        expect(icon.fill).toBe(true);
      } else if (i === 3) {
        expect(icon.getAttribute('name')).toBe('star_half');
        expect(icon.fill).toBe(true);
      } else {
        expect(icon.getAttribute('name')).toBe('star');
        expect(icon.fill).toBe(false);
      }
    });
  });

  it('previews half and whole star ratings on hover and resets on mouse leave', async () => {
    const el = await fixture<FiveStarRating>(html`<five-star-rating .value=${4}></five-star-rating>`);
    const icons = el.renderRoot.querySelectorAll<AppIcon>('app-icon');
    expect(icons).not.toBeNull();

    vi.spyOn(icons[2], 'getBoundingClientRect').mockReturnValue({
      left: 40,
      width: 20,
      top: 0,
      right: 60,
      bottom: 20,
      height: 20,
      x: 40,
      y: 0,
      toJSON: () => ({}),
    });

    // Hover left half of 3rd star -> 2.5
    icons[2].dispatchEvent(new MouseEvent('mousemove', { clientX: 45, bubbles: true }));
    await el.updateComplete;

    icons?.forEach((icon, i) => {
      if (i <= 1) {
        expect(icon.getAttribute('name')).toBe('star');
        expect(icon.fill).toBe(true);
      } else if (i === 2) {
        expect(icon.getAttribute('name')).toBe('star_half');
        expect(icon.fill).toBe(true);
      } else {
        expect(icon.getAttribute('name')).toBe('star');
        expect(icon.fill).toBe(false);
      }
      expect(icon.classList).toContain('hover');
    });

    // Hover right half of 3rd star -> 3
    icons[2].dispatchEvent(new MouseEvent('mousemove', { clientX: 55, bubbles: true }));
    await el.updateComplete;

    expect(icons[2].getAttribute('name')).toBe('star');
    expect(icons[2].fill).toBe(true);
    expect(icons[3].getAttribute('name')).toBe('star');
    expect(icons[3].fill).toBe(false);

    // Mouse leave resets to value=4
    el.dispatchEvent(new MouseEvent('mouseleave'));
    await el.updateComplete;

    icons.forEach((icon, i) => {
      if (i === 4) {
        expect(icon.getAttribute('name')).toBe('star');
        expect(icon.fill).toBe(false);
      } else {
        expect(icon.getAttribute('name')).toBe('star');
        expect(icon.fill).toBe(true);
      }
      expect(icon.classList).not.toContain('hover');
    });
  });

  it('emits valueSelected when clicked', async () => {
    const onValueSelected = vi.fn();
    const el = await fixture<FiveStarRating>(html`<five-star-rating></five-star-rating>`);
    el.addEventListener('valueSelected', (e: Event) => onValueSelected((e as CustomEvent).detail));
    const icons = el.renderRoot.querySelectorAll<AppIcon>('app-icon');

    vi.spyOn(icons[1], 'getBoundingClientRect').mockReturnValue({
      left: 20,
      width: 20,
      top: 0,
      right: 40,
      bottom: 20,
      height: 20,
      x: 20,
      y: 0,
      toJSON: () => ({}),
    });

    // Click left half of 2nd star -> 1.5
    icons[1].dispatchEvent(new MouseEvent('click', { clientX: 25, bubbles: true }));
    expect(onValueSelected).toHaveBeenCalledWith(1.5);
  });

  it('does not respond to hover or click when disabled', async () => {
    const onValueSelected = vi.fn();
    const el = await fixture<FiveStarRating>(html`<five-star-rating disabled .value=${3}></five-star-rating>`);
    el.addEventListener('valueSelected', (e: Event) => onValueSelected((e as CustomEvent).detail));
    const icons = el.renderRoot.querySelectorAll<AppIcon>('app-icon');

    icons[0].dispatchEvent(new MouseEvent('mousemove', { clientX: 10, bubbles: true }));
    await el.updateComplete;

    expect(icons[0].classList).not.toContain('hover');

    icons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onValueSelected).not.toHaveBeenCalled();
  });
});
