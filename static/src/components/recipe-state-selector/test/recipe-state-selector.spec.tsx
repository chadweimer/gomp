import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { RecipeStateSelector } from '../recipe-state-selector';
import { RecipeState } from '../../../generated';

describe('recipe-state-selector', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [RecipeStateSelector],
      html: '<recipe-state-selector></recipe-state-selector>',
    });
    expect(page.rootInstance).toBeInstanceOf(RecipeStateSelector);
  });

  it('defaults to Active', async () => {
    const page = await newSpecPage({
      components: [RecipeStateSelector],
      html: '<recipe-state-selector></recipe-state-selector>',
    });
    const component = page.rootInstance as RecipeStateSelector;
    expect(component.selectedStates).toEqual([RecipeState.Active]);
    const checkboxes = page.root.shadowRoot.querySelectorAll('ion-checkbox');
    let numChecked = 0;
    checkboxes.forEach(e => {
      if (e.hasAttribute('checked')) {
        expect(e).toEqualAttribute('value', RecipeState.Active);
        numChecked++;
      }
    });
    expect(numChecked).toEqual(1);
  });

  it('can be set to Archived', async () => {
    const page = await newSpecPage({
      components: [RecipeStateSelector],
      template: () => (<recipe-state-selector selectedStates={[RecipeState.Archived]}></recipe-state-selector>),
    });
    const checkboxes = page.root.shadowRoot.querySelectorAll('ion-checkbox');
    let numChecked = 0;
    checkboxes.forEach(e => {
      if (e.hasAttribute('checked')) {
        expect(e).toEqualAttribute('value', RecipeState.Archived);
        numChecked++;
      }
    });
    expect(numChecked).toEqual(1);
  });
});
