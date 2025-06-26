import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { RecipeViewer } from '../recipe-viewer';
import { Recipe, RecipeCompact, RecipeImage } from '../../../generated';

describe('recipe-viewer', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [RecipeViewer],
      html: '<recipe-viewer></recipe-viewer>',
    });
    expect(page.rootInstance).toBeInstanceOf(RecipeViewer);
  });

  it('bind to recipe', async () => {
    const recipe: Recipe = {
      name: 'Some Recipe',
      servingSize: null,
      time: null,
      ingredients: null,
      directions: null,
      nutritionInfo: null,
      storageInstructions: null,
      sourceUrl: null,
      tags: []
    };
    const page = await newSpecPage({
      components: [RecipeViewer],
      template: () => (<recipe-viewer recipe={recipe}></recipe-viewer>),
    });
    const component = page.rootInstance as RecipeViewer;
    expect(component.recipe).toEqual(recipe);
    const para = page.root.shadowRoot.querySelector('ion-card-title');
    expect(para).not.toBeNull();
    expect(para).toEqualText(recipe.name);
  });

  it('hide and show fields', async () => {
    const recipe: Recipe = {
      name: 'Some Recipe',
      servingSize: null,
      time: null,
      ingredients: null,
      directions: null,
      nutritionInfo: null,
      storageInstructions: null,
      sourceUrl: null,
      tags: []
    };
    const page = await newSpecPage({
      components: [RecipeViewer],
      template: () => (<recipe-viewer recipe={recipe}></recipe-viewer>),
    });
    const component = page.rootInstance as RecipeViewer;
    let items = page.root.shadowRoot.querySelectorAll('ion-item');

    // By default, there should be no items since the fields except name are null
    expect(items.length).toBe(0);
    const heading = page.root.shadowRoot.querySelector('ion-card-title');
    expect(heading).not.toBeNull();
    expect(heading).toEqualText(recipe.name);
    let subtitle = page.root.shadowRoot.querySelector('ion-card-subtitle');
    expect(subtitle.textContent.includes('Servings:')).toBe(false);
    expect(subtitle.textContent.includes('Time:')).toBe(false);

    // Serving Size
    component.recipe = { ...recipe, servingSize: 'serving size' };
    await page.waitForChanges();
    subtitle = page.root.shadowRoot.querySelector('ion-card-subtitle');
    expect(subtitle.textContent.includes('Servings: serving size')).toBe(true);

    // Time
    component.recipe = { ...recipe, time: 'time' };
    await page.waitForChanges();
    subtitle = page.root.shadowRoot.querySelector('ion-card-subtitle');
    expect(subtitle.textContent.includes('Time: time')).toBe(true);

    // Ingredients
    component.recipe = { ...recipe, ingredients: 'ingredients' };
    await page.waitForChanges();
    items = page.root.shadowRoot.querySelectorAll('ion-item');
    expect(items.length).toBe(1);
    let node = items[0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualAttribute('value', component.recipe.ingredients);

    // Directions
    component.recipe = { ...recipe, directions: 'directions' };
    await page.waitForChanges();
    items = page.root.shadowRoot.querySelectorAll('ion-item');
    expect(items.length).toBe(1);
    node = items[0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualAttribute('value', component.recipe.directions);

    // Nutrition Info
    component.recipe = { ...recipe, nutritionInfo: 'nutrition' };
    await page.waitForChanges();
    items = page.root.shadowRoot.querySelectorAll('ion-item');
    expect(items.length).toBe(1);
    node = items[0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualAttribute('value', component.recipe.nutritionInfo);

    // Storage Instructions
    component.recipe = { ...recipe, storageInstructions: 'storage' };
    await page.waitForChanges();
    items = page.root.shadowRoot.querySelectorAll('ion-item');
    expect(items.length).toBe(1);
    node = items[0].lastElementChild;
    expect(node).not.toBeNull();
    expect(node).toEqualAttribute('value', component.recipe.storageInstructions);

    // Source URL
    component.recipe = { ...recipe, sourceUrl: 'http://some.recipe/' };
    await page.waitForChanges();
    items = page.root.shadowRoot.querySelectorAll('ion-item');
    expect(items.length).toBe(1);
    node = items[0].lastElementChild;
    expect(node).not.toBeNull();
    const link = node.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.href).toEqualText(component.recipe.sourceUrl);
    expect(link).toEqualText(component.recipe.sourceUrl);

    // Tags
    let chips = page.root.shadowRoot.querySelectorAll('ion-chip');
    expect(chips.length).toBe(0);
    component.recipe = { ...recipe, tags: ['a', 'b'] };
    await page.waitForChanges();
    chips = page.root.shadowRoot.querySelectorAll('ion-chip');
    expect(chips.length).toBe(component.recipe.tags.length);
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
        servingSize: null,
        time: null,
        ingredients: null,
        directions: null,
        nutritionInfo: null,
        storageInstructions: null,
        sourceUrl: null,
        tags: [],
        createdAt: createdAt,
        modifiedAt: modifiedAt
      };
      const page = await newSpecPage({
        components: [RecipeViewer],
        template: () => (<recipe-viewer recipe={recipe}></recipe-viewer>),
      });
      const label = page.root.shadowRoot.querySelector('ion-card-subtitle')
      expect(label).not.toBeNull();
      expect(label.textContent.includes('Last Modified')).toBe(modified);
    }
  });

  it('bind to main image', async () => {
    const mainImage: RecipeImage = {
      recipeId: 1,
      name: 'image',
      url: 'http://example.com/image.jpg',
      thumbnailUrl: 'http://example.com/thumb.jpg'
    };
    const page = await newSpecPage({
      components: [RecipeViewer],
      template: () => (<recipe-viewer mainImage={mainImage}></recipe-viewer>),
    });
    const component = page.rootInstance as RecipeViewer;
    expect(component.mainImage).toEqual(mainImage);
    const img = page.root.shadowRoot.querySelector(`img[src='${mainImage.thumbnailUrl}']`);
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
    const page = await newSpecPage({
      components: [RecipeViewer],
      template: () => (<recipe-viewer links={links}></recipe-viewer>),
    });

    // Having links should result in an ion-item
    const items = page.root.shadowRoot.querySelectorAll('ion-card-content > ion-item');
    expect(items.length).toBe(1);

    // There should be elements for each link
    const linkItems = items[0].querySelectorAll('ion-item');
    expect(linkItems.length).toBe(links.length);

    // Each link should be present
    for (const link of links) {
      const linkElement = items[0].querySelector(`ion-router-link[href='/recipes/${link.id}']`);
      expect(linkElement).not.toBeNull();
      expect(linkElement).toEqualText(link.name);
    }
  });
});
