import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import { Recipe, RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import './recipe-viewer';
import { RecipeViewer } from './recipe-viewer';
import { HTMLViewer } from '../html-viewer/html-viewer';

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

  it('hide and show fields step by step', async () => {
    const el = await fixture<RecipeViewer>(html`<recipe-viewer .recipe=${baseRecipe}></recipe-viewer>`);
    let items = el.shadowRoot?.querySelectorAll('ion-item');
    expect(items).toHaveLength(0);

    const heading = el.shadowRoot?.querySelector('ion-card-title');
    expect(heading?.textContent?.trim()).toBe(baseRecipe.name);

    let subtitle = el.shadowRoot?.querySelector('ion-card-subtitle.details');
    expect(subtitle?.textContent).not.toContain('Servings:');
    expect(subtitle?.textContent).not.toContain('Time:');
    expect(subtitle?.textContent).not.toContain('Source:');

    // Serving Size
    el.recipe = { ...baseRecipe, servingSize: 'serving size' };
    await el.updateComplete;
    subtitle = el.shadowRoot?.querySelector('ion-card-subtitle.details');
    expect(subtitle?.textContent).toContain('Servings: serving size');

    // Time
    el.recipe = { ...baseRecipe, time: 'time' };
    await el.updateComplete;
    subtitle = el.shadowRoot?.querySelector('ion-card-subtitle.details');
    expect(subtitle?.textContent).toContain('Time: time');

    // Source URL
    el.recipe = { ...baseRecipe, sourceUrl: 'http://some.recipe/' };
    await el.updateComplete;
    subtitle = el.shadowRoot?.querySelector('ion-card-subtitle.details');
    expect(subtitle?.textContent).toContain('Source:');
    expect(subtitle?.textContent).toContain('http://some.recipe/');

    // Ingredients
    el.recipe = { ...baseRecipe, ingredients: 'ingredients' };
    await el.updateComplete;
    items = el.shadowRoot?.querySelectorAll('ion-item');
    expect(items).toHaveLength(1);
    let viewer = items?.[0].querySelector<HTMLViewer>('html-viewer');
    expect(viewer?.value).toBe(el.recipe?.ingredients);

    // Directions
    el.recipe = { ...baseRecipe, directions: 'directions' };
    await el.updateComplete;
    items = el.shadowRoot?.querySelectorAll('ion-item');
    expect(items).toHaveLength(1);
    viewer = items?.[0].querySelector<HTMLViewer>('html-viewer');
    expect(viewer?.value).toBe(el.recipe?.directions);

    // Nutrition Info
    el.recipe = { ...baseRecipe, nutritionInfo: 'nutrition' };
    await el.updateComplete;
    items = el.shadowRoot?.querySelectorAll('ion-item');
    expect(items).toHaveLength(1);
    viewer = items?.[0].querySelector<HTMLViewer>('html-viewer');
    expect(viewer?.value).toBe(el.recipe?.nutritionInfo);

    // Storage Instructions
    el.recipe = { ...baseRecipe, storageInstructions: 'storage' };
    await el.updateComplete;
    items = el.shadowRoot?.querySelectorAll('ion-item');
    expect(items).toHaveLength(1);
    viewer = items?.[0].querySelector<HTMLViewer>('html-viewer');
    expect(viewer?.value).toBe(el.recipe?.storageInstructions);

    // Tags
    let badges = el.shadowRoot?.querySelectorAll('.tags ion-badge');
    expect(badges).toHaveLength(0);
    el.recipe = { ...baseRecipe, tags: ['a', 'b'] };
    await el.updateComplete;
    badges = el.shadowRoot?.querySelectorAll('.tags ion-badge');
    expect(badges).toHaveLength(2);
  });

  it('modified date used', async () => {
    const values = [true, false];
    for (const modified of values) {
      const createdAt = new Date();
      let modifiedAt = new Date();
      modifiedAt.setDate(modifiedAt.getDate() + 1);
      modifiedAt = modified ? modifiedAt : createdAt;
      const recipe: Recipe = {
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
        tags: [],
        createdAt: createdAt.toISOString(),
        modifiedAt: modifiedAt.toISOString()
      };
      const el = await fixture<RecipeViewer>(html`<recipe-viewer .recipe=${recipe}></recipe-viewer>`);
      const label = el.shadowRoot?.querySelector('ion-card-subtitle.details');
      expect(label).not.toBeNull();
      if (modified) {
        expect(label?.textContent).toContain('Last Modified');
      } else {
        expect(label?.textContent).not.toContain('Last Modified');
      }
    }
  });

  it('bind to main image and loads full image on thumbnail load', async () => {
    const recipe: Recipe = {
      id: 1,
      name: 'image',
      state: RecipeState.Active,
      rating: 0,
      servingSize: '',
      time: '',
      nutritionInfo: '',
      ingredients: '',
      directions: '',
      storageInstructions: '',
      sourceUrl: '',
      mainImageName: 'image.jpg',
      tags: []
    };
    const el = await fixture<RecipeViewer>(html`<recipe-viewer .recipe=${recipe}></recipe-viewer>`);
    const img = el.shadowRoot?.querySelector<HTMLImageElement>(`img[src='/uploads/recipes/${recipe.id}/thumbs/${recipe.mainImageName}']`);
    expect(img).not.toBeNull();
    img?.dispatchEvent(new Event('load'));
  });

  it('bind to links', async () => {
    const numLinks = 5;
    const links: RecipeCompact[] = [];
    for (let i = 0; i < numLinks; i++) {
      links.push({
        id: i,
        name: `recipe ${i}`,
        state: RecipeState.Active,
        mainImageName: `${i}.jpg`,
        rating: 0,
        tags: []
      });
    }
    const el = await fixture<RecipeViewer>(html`<recipe-viewer .links=${links}></recipe-viewer>`);

    const linksList = el.shadowRoot?.querySelector<HTMLIonListElement>('ion-list.links');
    expect(linksList).not.toBeNull();

    const linkItems = linksList?.querySelectorAll('ion-item-sliding');
    expect(linkItems).toHaveLength(numLinks);

    for (const link of links) {
      const router = linksList?.querySelector(`ion-router-link[href='/recipes/${link.id}']`);
      expect(router?.textContent?.trim()).toBe(link.name);
    }
  });

  it('renders directions with clickable inline image thumbnails when sentinels are present', async () => {
    const recipe: Recipe = {
      id: 7,
      name: 'Pancakes',
      state: RecipeState.Active,
      rating: 5,
      servingSize: '4',
      time: '30m',
      ingredients: '',
      directions: '<p>Step 1: Mix {{image:batter.jpg}}</p>',
      nutritionInfo: '',
      storageInstructions: '',
      sourceUrl: '',
      mainImageName: '',
      tags: [],
    };
    const el = await fixture<RecipeViewer>(html`<recipe-viewer .recipe=${recipe}></recipe-viewer>`);
    const htmlViewer = el.shadowRoot?.querySelector<HTMLViewer>('html-viewer');
    expect(htmlViewer).not.toBeNull();
    expect(htmlViewer?.value).toBe(
      '<p>Step 1: Mix <a href="/uploads/recipes/7/images/batter.jpg" target="_blank" rel="noopener noreferrer"><img src="/uploads/recipes/7/images/batter.jpg" alt="batter.jpg" data-image="batter.jpg"></a></p>'
    );
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
