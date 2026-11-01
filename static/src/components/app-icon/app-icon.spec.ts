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
    expect(span?.classList.contains('filled')).toBe(false);
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
