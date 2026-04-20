import { render, h, describe, it, expect } from '@stencil/vitest';
import { Recipe, RecipeCompact, RecipeImage } from '../../../generated';
import '../recipe-viewer';

describe('recipe-viewer', () => {
  it('builds', async () => {
    const { root } = await render(<recipe-viewer />);
    expect(root).toHaveClass('hydrated');
  });

  it('bind to recipe', async () => {
    const recipe: Recipe = {
      name: 'Some Recipe',
      servingSize: '',
      time: '',
      ingredients: '',
      directions: '',
      nutritionInfo: '',
      storageInstructions: '',
      sourceUrl: '',
      tags: []
    };
    const { root } = await render(<recipe-viewer recipe={recipe}></recipe-viewer>);
    expect(root).toHaveProperty('recipe', recipe);
    const para = root.shadowRoot?.querySelector('ion-card-title');
    expect(para).not.toBeNull();
    expect(para).toEqualText(recipe.name);
  });

  it('hide and show fields', async () => {
    const recipe: Recipe = {
      name: 'Some Recipe',
      servingSize: '',
      time: '',
      ingredients: '',
      directions: '',
      nutritionInfo: '',
      storageInstructions: '',
      sourceUrl: '',
      tags: []
    };
    const { root, waitForChanges, setProps } = await render<HTMLRecipeViewerElement>(<recipe-viewer recipe={recipe}></recipe-viewer>);
    let items = root.shadowRoot?.querySelectorAll('ion-item');

    // By default, there should be no items since the fields except name are null
    expect(items?.length).toBe(0);
    const heading = root.shadowRoot?.querySelector('ion-card-title');
    expect(heading).not.toBeNull();
    expect(heading).toEqualText(recipe.name);
    let subtitle = root.shadowRoot?.querySelector('ion-card-subtitle');
    expect(subtitle?.textContent.includes('Servings:')).toBe(false);
    expect(subtitle?.textContent.includes('Time:')).toBe(false);

    // Serving Size
    await setProps({ recipe: { ...recipe, servingSize: 'serving size' } });
    await waitForChanges();
    subtitle = root.shadowRoot?.querySelector('ion-card-subtitle');
    expect(subtitle?.textContent.includes('Servings: serving size')).toBe(true);

    // Time
    await setProps({ recipe: { ...recipe, time: 'time' } });
    await waitForChanges();
    subtitle = root.shadowRoot?.querySelector('ion-card-subtitle');
    expect(subtitle?.textContent.includes('Time: time')).toBe(true);

    // Ingredients
    await setProps({ recipe: { ...recipe, ingredients: 'ingredients' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('ion-item');
    expect(items?.length).toBe(1);
    let node = items![0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toHaveProperty('value', root.recipe!.ingredients);

    // Directions
    await setProps({ recipe: { ...recipe, directions: 'directions' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('ion-item');
    expect(items?.length).toBe(1);
    node = items![0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toHaveProperty('value', root.recipe!.directions);

    // Nutrition Info
    await setProps({ recipe: { ...recipe, nutritionInfo: 'nutrition' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('ion-item');
    expect(items?.length).toBe(1);
    node = items![0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toHaveProperty('value', root.recipe!.nutritionInfo);

    // Storage Instructions
    await setProps({ recipe: { ...recipe, storageInstructions: 'storage' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('ion-item');
    expect(items?.length).toBe(1);
    node = items![0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toHaveProperty('value', root.recipe!.storageInstructions);

    // Source URL
    await setProps({ recipe: { ...recipe, sourceUrl: 'http://some.recipe/' } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    items = root.shadowRoot?.querySelectorAll('ion-item');
    expect(items?.length).toBe(1);
    node = items![0].lastElementChild;
    expect(node).not.toBeNull();
    const link = node?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link).toEqualAttribute('href', root.recipe!.sourceUrl);
    expect(link).toEqualText(root.recipe!.sourceUrl);

    // Tags
    let chips = root.shadowRoot?.querySelectorAll('ion-chip');
    expect(chips?.length).toBe(0);
    await setProps({ recipe: { ...recipe, tags: ['a', 'b'] } });
    await waitForChanges();
    expect(root.recipe).not.toBeNull();
    chips = root.shadowRoot?.querySelectorAll('ion-chip');
    expect(chips?.length).toBe(root.recipe!.tags.length);
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
        servingSize: '',
        time: '',
        ingredients: '',
        directions: '',
        nutritionInfo: '',
        storageInstructions: '',
        sourceUrl: '',
        tags: [],
        createdAt: createdAt,
        modifiedAt: modifiedAt
      };
      const { root } = await render(<recipe-viewer recipe={recipe}></recipe-viewer>);
      const label = root.shadowRoot?.querySelector('ion-card-subtitle');
      expect(label).not.toBeNull();
      expect(label?.textContent.includes('Last Modified')).toBe(modified);
    }
  });

  it('bind to main image', async () => {
    const mainImage: RecipeImage = {
      recipeId: 1,
      name: 'image',
      url: 'http://example.com/image.jpg',
      thumbnailUrl: 'http://example.com/thumb.jpg'
    };
    const { root } = await render(<recipe-viewer mainImage={mainImage}></recipe-viewer>);
    expect(root).toHaveProperty('mainImage', mainImage);
    const img = root.shadowRoot?.querySelector(`img[src='${mainImage.thumbnailUrl}']`);
    expect(img).not.toBeNull();
  });

  it('bind to links', async () => {
    // Generate 1-10 links
    const numLinks = Math.floor(Math.random() * 10 + 1);
    const links: RecipeCompact[] = [];
    for (let i = 0; i < numLinks; i++) {
      links.push({
        id: i,
        name: `recipe ${i}`,
        thumbnailUrl: `http://example.com/${i}.jpg`
      });
    }
    const { root } = await render(<recipe-viewer links={links}></recipe-viewer>);

    // Having links should result in an ion-item
    const items = root.shadowRoot?.querySelectorAll('ion-card-content > ion-item');
    expect(items?.length).toBe(1);

    // There should be elements for each link
    const linkItems = items![0].querySelectorAll('ion-item');
    expect(linkItems.length).toBe(links.length);

    // Each link should be present
    const linkElements = items![0].querySelectorAll('ion-router-link');
    expect(linkElements.length).toBe(links.length);
    for (const link of links) {
      let found = false;
      linkElements.forEach(linkElement => {
        const anchor = linkElement.shadowRoot?.querySelector(`a[href='/recipes/${link.id}']`);
        if (anchor !== null) {
          expect(linkElement).toEqualText(link.name);
          found = true;
        }
      });
      expect(found).toBe(true);
    }
  });
});
