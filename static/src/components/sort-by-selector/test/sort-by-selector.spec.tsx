import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { SortBySelector } from '../sort-by-selector';
import { SortBy } from '../../../generated';

describe('sort-by-selector', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [SortBySelector],
      html: '<sort-by-selector></sort-by-selector>',
    });
    expect(page.rootInstance).toBeInstanceOf(SortBySelector);
  });

  it('defaults to Name', async () => {
    const page = await newSpecPage({
      components: [SortBySelector],
      html: '<sort-by-selector></sort-by-selector>',
    });
    const component = page.rootInstance as SortBySelector;
    expect(component.sortBy).toEqual(SortBy.Name);
    const radioGroup = page.root.shadowRoot.querySelector('ion-radio-group');
    expect(radioGroup).not.toBeNull();
    expect(radioGroup).toEqualAttribute('value', SortBy.Name);
  });

  for (const value in SortBy) {
    it('can be set to ' + value, async () => {
      const page = await newSpecPage({
        components: [SortBySelector],
        template: () => (<sort-by-selector sortBy={value as SortBy}></sort-by-selector>),
      });
      const component = page.rootInstance as SortBySelector;
      expect(component.sortBy).toEqual(value);
      const radioGroup = page.root.shadowRoot.querySelector('ion-radio-group');
      expect(radioGroup).toEqualAttribute('value', value);
    });
  }
});
