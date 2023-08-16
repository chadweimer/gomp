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
    // const checkboxes = page.root.querySelectorAll('ion-checkbox');
    // let numChecked = 0;
    // checkboxes.forEach(e => {
    //   if (e.checked) {
    //     expect(e).toEqualAttribute('value', RecipeState.Active);
    //     numChecked++;
    //   }
    // });
    // expect(numChecked).toEqual(1);
  });

  for (const value in RecipeState)
  {
   it('can be set to ' + value, async () => {
     const page = await newSpecPage({
       components: [RecipeStateSelector],
       template: () => (<recipe-state-selector selectedStates={[value as RecipeState]}></recipe-state-selector>),
     });
     const component = page.rootInstance as RecipeStateSelector;
     expect(component.selectedStates).toEqual([value]);
    //  const checkboxes = page.root.querySelectorAll('ion-checkbox');
    //  let numChecked = 0;
    //  checkboxes.forEach(e => {
    //    if (e.hasAttribute('checked')) {
    //      expect(e).toEqualAttribute('value', value);
    //      numChecked++;
    //    }
    //  });
    //  expect(numChecked).toEqual(1);
   });
  }
});
