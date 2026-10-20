import { render, h, describe, it, expect, vi } from '@stencil/vitest';
import { RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import './recipe-card';

describe('recipe-card', () => {
  it('builds', async () => {
    const { root } = await render(<recipe-card />);
    expect(root).toHaveClass('hydrated');
  });

  it('defaults', async () => {
    const recipe: RecipeCompact = {
      name: '',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 0,
      tags: [],
    };
    const { root } = await render<HTMLRecipeCardElement>(<recipe-card />);
    expect(root.recipe).toEqual(recipe);
    const image = root.shadowRoot?.querySelector('img.hidden');
    expect(image).not.toBeNull();
    const node = root.shadowRoot?.querySelector('ion-card-title');
    expect(node).not.toBeNull();
    expect(node).toEqualText('');
    const rating = root.shadowRoot?.querySelector('five-star-rating');
    expect(rating).not.toBeNull();
    expect(rating).toEqualAttribute('value', '0');
  });

  it('bind to recipe', async () => {
    const recipe: RecipeCompact = {
      name: 'Some Recipe',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 2,
      tags: []
    };
    const { root } = await render(<recipe-card recipe={recipe} />);
    expect(root).toHaveProperty('recipe', recipe);
    const image = root.shadowRoot?.querySelector('img.hidden');
    expect(image).not.toBeNull();
    const node = root.shadowRoot?.querySelector('ion-card-title');
    expect(node).not.toBeNull();
    expect(node).toEqualText(recipe.name);
    const rating = root.shadowRoot?.querySelector('five-star-rating');
    expect(rating).not.toBeNull();
    expect(rating).toEqualAttribute('value', recipe.rating?.toString() ?? '0');
  });
  it('renders tags with title tooltip', async () => {
    const recipe: RecipeCompact = {
      name: 'Tagged Recipe',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 4,
      tags: ['dinner', 'chicken'],
    };
    const { root } = await render(<recipe-card recipe={recipe} />);
    const tagBadges = root.shadowRoot?.querySelectorAll('.tags ion-badge:not(.probe-badge)');
    expect(tagBadges).toHaveLength(2);
    expect(tagBadges?.[0]).toEqualText('dinner');
    expect(tagBadges?.[0]).toEqualAttribute('title', 'dinner');
    expect(tagBadges?.[1]).toEqualText('chicken');
    expect(tagBadges?.[1]).toEqualAttribute('title', 'chicken');
    const moreBadge = root.shadowRoot?.querySelector('.more-badge');
    expect(moreBadge).toBeNull();
  });

  it('renders overflow badge when tags exceed width', async () => {
    const recipe: RecipeCompact = {
      name: 'Many Tags Recipe',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 4,
      tags: ['tag1', 'tag2', 'tag3'],
    };
    const { root, waitForChanges } = await render<HTMLRecipeCardElement>(<recipe-card recipe={recipe} />);
    const container = root.shadowRoot?.querySelector('.tags') as HTMLElement;
    expect(container).not.toBeNull();

    Object.defineProperty(container, 'clientWidth', { value: 100, configurable: true });

    // Mock probe badge width to 30px
    const probe = root.shadowRoot?.querySelector('.probe-badge') as HTMLElement;
    vi.spyOn(probe, 'getBoundingClientRect').mockReturnValue({
      width: 30,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 30,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Mock tag elements width to 40px each
    const badges = root.shadowRoot?.querySelectorAll('.tags ion-badge:not(.probe-badge)');
    badges?.forEach(b => {
      vi.spyOn(b, 'getBoundingClientRect').mockReturnValue({
        width: 40,
        height: 20,
        top: 0,
        left: 0,
        bottom: 20,
        right: 40,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
    });

    // Trigger recalculation
    root.recipe = { ...recipe };
    await waitForChanges();

    const visibleBadges = root.shadowRoot?.querySelectorAll('.tags ion-badge:not(.probe-badge):not(.more-badge)');
    expect(visibleBadges).toHaveLength(1);
    expect(visibleBadges?.[0]).toEqualText('tag1');

    const moreBadge = root.shadowRoot?.querySelector('.more-badge');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge).toEqualText('+2');
    expect(moreBadge).toEqualAttribute('title', 'tag2, tag3');
  });

  it('truncates first tag with ellipsis when even first tag exceeds available width', async () => {
    const recipe: RecipeCompact = {
      name: 'Long Tag Recipe',
      state: RecipeState.Active,
      mainImageName: '',
      rating: 4,
      tags: ['very-long-tag-name', 'tag2'],
    };
    const { root, waitForChanges } = await render<HTMLRecipeCardElement>(<recipe-card recipe={recipe} />);
    const container = root.shadowRoot?.querySelector('.tags') as HTMLElement;

    Object.defineProperty(container, 'clientWidth', { value: 100, configurable: true });

    const probe = root.shadowRoot?.querySelector('.probe-badge') as HTMLElement;
    vi.spyOn(probe, 'getBoundingClientRect').mockReturnValue({
      width: 30,
      height: 20,
      top: 0,
      left: 0,
      bottom: 20,
      right: 30,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const badges = root.shadowRoot?.querySelectorAll('.tags ion-badge:not(.probe-badge)');
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
        toJSON: () => {},
      });
    });

    root.recipe = { ...recipe };
    await waitForChanges();

    const visibleBadges = root.shadowRoot?.querySelectorAll('.tags ion-badge:not(.probe-badge):not(.more-badge)');
    expect(visibleBadges).toHaveLength(1);
    expect(visibleBadges?.[0]).toHaveClass('truncate-single');
    expect(visibleBadges?.[0]).toEqualText('very-long-tag-name');

    const moreBadge = root.shadowRoot?.querySelector('.more-badge');
    expect(moreBadge).not.toBeNull();
    expect(moreBadge).toEqualText('+1');
    expect(moreBadge).toEqualAttribute('title', 'tag2');
  });
});
