import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import { RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import './recipe-card';
import { RecipeCard } from './recipe-card';

describe('recipe-card', () => {
  it('renders defaults', async () => {
    const el = await fixture<RecipeCard>(html`<recipe-card></recipe-card>`);
    const img = el.renderRoot.querySelector('img.hidden');
    expect(img).not.toBeNull();

    const title = el.renderRoot.querySelector('ion-card-title');
    expect(title?.textContent?.trim()).toBe('');

    const rating = el.renderRoot.querySelector('five-star-rating');
    expect(rating).not.toBeNull();
    expect(rating?.value).toBe(0);
  });

  it('binds to recipe and renders title and rating', async () => {
    const recipe: RecipeCompact = {
      id: 42,
      name: 'Delicious Soup',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 4,
      tags: ['soup', 'warm'],
    };

    const el = await fixture<RecipeCard>(html`<recipe-card .recipe=${recipe}></recipe-card>`);
    const title = el.renderRoot.querySelector('ion-card-title');
    expect(title?.textContent?.trim()).toBe('Delicious Soup');

    const card = el.renderRoot.querySelector('ion-card');
    expect(card?.getAttribute('href')).toBe('/recipes/42');

    const tagBadges = el.renderRoot.querySelectorAll('.tags ion-badge:not(.probe-badge)');
    expect(tagBadges).toHaveLength(2);
  });

  it('renders tags with title tooltip', async () => {
    const recipe: RecipeCompact = {
      name: 'Tagged Recipe',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 4,
      tags: ['dinner', 'chicken'],
    };
    const el = await fixture<RecipeCard>(html`<recipe-card .recipe=${recipe}></recipe-card>`);
    const tagBadges = el.renderRoot.querySelectorAll('.tags ion-badge:not(.probe-badge)');
    expect(tagBadges).toHaveLength(2);
    expect(tagBadges?.[0].textContent?.trim()).toBe('dinner');
    expect(tagBadges?.[0].getAttribute('title')).toBe('dinner');
    expect(tagBadges?.[1].textContent?.trim()).toBe('chicken');
    expect(tagBadges?.[1].getAttribute('title')).toBe('chicken');
    const moreBadge = el.renderRoot.querySelector('.more-badge');
    expect(moreBadge).toBeNull();
  });

  it('renders archived badge when recipe is archived', async () => {
    const recipe: RecipeCompact = {
      id: 1,
      name: 'Archived Recipe',
      state: RecipeState.Archived,
      mainImageName: '',
      rating: 0,
      tags: [],
    };

    const el = await fixture<RecipeCard>(html`<recipe-card .recipe=${recipe}></recipe-card>`);
    const badge = el.renderRoot.querySelector('ion-badge.top-right-padded');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('Archived');
  });

  it('renders overflow badge when tags exceed width', async () => {
    const recipe: RecipeCompact = {
      name: 'Many Tags Recipe',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 4,
      tags: ['tag1', 'tag2', 'tag3'],
    };

    const el = await fixture<RecipeCard>(html`<recipe-card .recipe=${recipe}></recipe-card>`);
    const container = el.renderRoot.querySelector('.tags') as HTMLElement;
    expect(container).not.toBeNull();

    Object.defineProperty(container, 'clientWidth', { value: 100, configurable: true });

    const probe = el.renderRoot.querySelector('.probe-badge') as HTMLElement;
    vi.spyOn(probe, 'getBoundingClientRect').mockReturnValue({
      width: 30,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 30,
      x: 0,
      y: 0,
      toJSON: () => { },
    });

    const badges = el.renderRoot.querySelectorAll('.tags ion-badge:not(.probe-badge)');
    badges?.forEach((b) => {
      vi.spyOn(b, 'getBoundingClientRect').mockReturnValue({
        width: 40,
        height: 20,
        top: 0,
        left: 0,
        bottom: 20,
        right: 40,
        x: 0,
        y: 0,
        toJSON: () => { },
      });
    });

    el.calculateVisibleTags();
    await el.updateComplete;

    const visibleBadges = el.renderRoot.querySelectorAll('.tags ion-badge.tag-badge');
    expect(visibleBadges?.length).toBe(1);

    const moreBadge = el.renderRoot.querySelector('.tags .more-badge');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge?.textContent?.trim()).toBe('+2');
  });

  it('truncates first tag with ellipsis when even first tag exceeds available width', async () => {
    const recipe: RecipeCompact = {
      name: 'Long Tag Recipe',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 4,
      tags: ['very-long-tag-name', 'tag2'],
    };
    const el = await fixture<RecipeCard>(html`<recipe-card .recipe=${recipe}></recipe-card>`);
    const container = el.renderRoot.querySelector('.tags') as HTMLElement;

    Object.defineProperty(container, 'clientWidth', { value: 100, configurable: true });

    const probe = el.renderRoot.querySelector('.probe-badge') as HTMLElement;
    vi.spyOn(probe, 'getBoundingClientRect').mockReturnValue({
      width: 30,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 30,
      x: 0,
      y: 0,
      toJSON: () => { },
    });

    const badges = el.renderRoot.querySelectorAll('.tags ion-badge:not(.probe-badge)');
    badges?.forEach((b, idx) => {
      vi.spyOn(b, 'getBoundingClientRect').mockReturnValue({
        width: idx === 0 ? 120 : 40,
        height: 20,
        top: 0,
        left: 0,
        bottom: 20,
        right: idx === 0 ? 120 : 40,
        x: 0,
        y: 0,
        toJSON: () => { },
      });
    });

    el.calculateVisibleTags();
    await el.updateComplete;

    const visibleBadges = el.renderRoot.querySelectorAll('.tags ion-badge:not(.probe-badge):not(.more-badge)');
    expect(visibleBadges).toHaveLength(1);
    expect(visibleBadges?.[0].classList.contains('truncate-single')).toBe(true);
    expect(visibleBadges?.[0].textContent?.trim()).toBe('very-long-tag-name');

    const moreBadge = el.renderRoot.querySelector('.more-badge');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge?.textContent?.trim()).toBe('+1');
    expect(moreBadge?.getAttribute('title')).toBe('tag2');
  });
});

