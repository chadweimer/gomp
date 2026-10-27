import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import { Recipe, RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import './recipe-viewer';
import { RecipeViewer } from './recipe-viewer';

describe('recipe-viewer', () => {
  const baseRecipe: Recipe = {
    name: 'Some Recipe',
    state: RecipeState.Active,
    rating: 0,
    servingSize: '',
    time: '',
    ingredients: '',
    directions: '',
    nutritionInfo: '',
    storageInstructions: '',
    sourceUrl: '',
    mainImageName: '',
    tags: []
  };

  it('renders and binds to recipe title', async () => {
    const el = await fixture<RecipeViewer>(html`<recipe-viewer .recipe=${baseRecipe}></recipe-viewer>`);
    const title = el.shadowRoot?.querySelector('ion-card-title');
    expect(title?.textContent?.trim()).toBe('Some Recipe');
  });

  it('toggles detail fields and sections conditionally', async () => {
    const el = await fixture<RecipeViewer>(html`<recipe-viewer .recipe=${baseRecipe}></recipe-viewer>`);
    let items = el.shadowRoot?.querySelectorAll('ion-item');
    expect(items).toHaveLength(0);

    el.recipe = {
      ...baseRecipe,
      servingSize: '4 servings',
      time: '45 mins',
      sourceUrl: 'https://example.com/recipe',
      ingredients: 'Apples, Flour',
      directions: 'Mix and bake',
      storageInstructions: 'Keep refrigerated',
      nutritionInfo: '200 calories'
    };
    await el.updateComplete;

    const subtitle = el.shadowRoot?.querySelector('ion-card-subtitle.details');
    expect(subtitle?.textContent).toContain('Servings: 4 servings');
    expect(subtitle?.textContent).toContain('Time: 45 mins');
    expect(subtitle?.textContent).toContain('Source:');

    items = el.shadowRoot?.querySelectorAll('ion-item');
    expect(items).toHaveLength(4);
  });

  it('renders related recipe links and handles delete link event', async () => {
    const mockLinks: RecipeCompact[] = [
      { id: 10, name: 'Side Salad', state: RecipeState.Active, mainImageName: '', rating: 3, tags: [] },
    ];
    const onDelete = vi.fn();

    const el = await fixture<RecipeViewer>(html`
      <recipe-viewer .recipe=${baseRecipe} .links=${mockLinks}></recipe-viewer>
    `);
    el.addEventListener('deleteLinkClicked', (e: Event) => onDelete((e as CustomEvent).detail));

    const linkEl = el.shadowRoot?.querySelector('ion-list.links ion-router-link');
    expect(linkEl?.textContent?.trim()).toBe('Side Salad');

    const removeBtn = el.shadowRoot?.querySelector('ion-item-option[color="danger"]') as HTMLElement;
    removeBtn.click();
    expect(onDelete).toHaveBeenCalledWith(mockLinks[0]);
  });

  it('emits tagClicked and ratingSelected events', async () => {
    const onTag = vi.fn();
    const onRating = vi.fn();

    const el = await fixture<RecipeViewer>(html`
      <recipe-viewer
        .recipe=${{ ...baseRecipe, tags: ['quick', 'easy'], rating: 2 }}
      ></recipe-viewer>
    `);
    el.addEventListener('tagClicked', (e: Event) => onTag((e as CustomEvent).detail));
    el.addEventListener('ratingSelected', (e: Event) => onRating((e as CustomEvent).detail));

    const tagBadge = el.shadowRoot?.querySelector('ion-card-subtitle.tags ion-badge') as HTMLElement;
    tagBadge.click();
    expect(onTag).toHaveBeenCalledWith('quick');

    const ratingEl = el.shadowRoot?.querySelector('five-star-rating') as HTMLElement;
    ratingEl.dispatchEvent(new CustomEvent('valueSelected', { detail: 5, bubbles: true, composed: true }));
    expect(onRating).toHaveBeenCalledWith(5);
  });
});
