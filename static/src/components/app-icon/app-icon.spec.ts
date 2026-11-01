import { fixture, html } from '@open-wc/testing';
import { describe, it, expect } from 'vitest';
import './app-icon';
import { AppIcon } from './app-icon';

describe('app-icon', () => {
  it('renders default outlined symbol with ligature name', async () => {
    const el = await fixture<AppIcon>(html`<app-icon name="home"></app-icon>`);
    const span = el.renderRoot.querySelector('.symbol');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('home');
    expect(span?.classList.contains('outlined')).toBe(true);
    expect(span?.classList.contains('filled')).toBe(false);
  });

  it('renders rounded and sharp variants', async () => {
    const elRounded = await fixture<AppIcon>(html`<app-icon name="star" variant="rounded"></app-icon>`);
    const roundedSpan = elRounded.renderRoot.querySelector('.symbol');
    expect(roundedSpan?.classList.contains('rounded')).toBe(true);
    expect(roundedSpan?.classList.contains('outlined')).toBe(false);

    const elSharp = await fixture<AppIcon>(html`<app-icon name="settings" variant="sharp"></app-icon>`);
    const sharpSpan = elSharp.renderRoot.querySelector('.symbol');
    expect(sharpSpan?.classList.contains('sharp')).toBe(true);
  });

  it('toggles filled class when fill property is true', async () => {
    const el = await fixture<AppIcon>(html`<app-icon name="favorite" ?fill=${true}></app-icon>`);
    const span = el.renderRoot.querySelector('.symbol');
    expect(span?.classList.contains('filled')).toBe(true);
  });

  it('reflects size and color attributes', async () => {
    const el = await fixture<AppIcon>(html`<app-icon name="delete" size="small" color="danger"></app-icon>`);
    expect(el.getAttribute('size')).toBe('small');
    expect(el.getAttribute('color')).toBe('danger');
  });
});

