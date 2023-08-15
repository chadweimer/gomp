import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { RecipeStateSelector } from '../recipe-state-selector';
import { RecipeState } from '../../../generated';

describe('recipe-state-selector', () => {
  it('builds', () => {
    expect(new RecipeStateSelector()).toBeTruthy();
  });

  it('defaults to Active', async () => {
    const page = await newSpecPage({
      components: [RecipeStateSelector],
      html: '<recipe-state-selector></recipe-state-selector>',
    });
    const component = page.rootInstance as RecipeStateSelector;
    expect(component.selectedStates).toEqual([RecipeState.Active]);
    //const checkboxes = page.root.querySelectorAll('ion-checkbox[checked]')
    //expect(checkboxes).toBeTruthy();
    //expect(checkboxes).toHaveLength(1);
  });

  //for (const value in SortBy)
  //{
  //  it('can be set to ' + value, async () => {
  //    const page = await newSpecPage({
  //      components: [SortBySelector],
  //      template: () => (<sort-by-selector sortBy={value as SortBy}></sort-by-selector>),
  //    });
  //    const component = page.rootInstance as SortBySelector;
  //    expect(component.sortBy).toEqual(value);
  //    const radioGroup = page.root.shadowRoot.querySelector('ion-radio-group');
  //    expect(radioGroup).toEqualAttribute('value', value);
  //  });
  //}
});
