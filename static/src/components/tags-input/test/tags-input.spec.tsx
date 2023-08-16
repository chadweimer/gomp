import { newSpecPage } from '@stencil/core/testing';
import { TagsInput } from '../tags-input';
import { h } from '@stencil/core';

describe('tags-input', () => {
  it('builds', async () => {
    const page = await newSpecPage({
      components: [TagsInput],
      html: '<tags-input></tags-input>',
    });
    expect(page.rootInstance).toBeInstanceOf(TagsInput);
  });

  it('default label', async () => {
    const page = await newSpecPage({
      components: [TagsInput],
      html: '<tags-input></tags-input>',
    });
    const expectedLabel = 'Tags';
    const component = page.rootInstance as TagsInput;
    expect(component.label).toEqual(expectedLabel);
    const label = page.root.querySelector('ion-label');
    expect(label).toBeTruthy();
    expect(label).toEqualText(expectedLabel);
  });

  it('label is used', async () => {
    const expectedLabel = 'My Label';
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input label={expectedLabel}></tags-input>),
    });
    const component = page.rootInstance as TagsInput;
    expect(component.label).toEqual(expectedLabel);
    const label = page.root.querySelector('ion-label');
    expect(label).toBeTruthy();
    expect(label).toEqualText(expectedLabel);
  });

  it('uses tags', async () => {
    const expectedTags = ['tag1', 'tag2'];
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input value={expectedTags}></tags-input>),
    });
    const component = page.rootInstance as TagsInput;
    expect(component.value).toEqual(expectedTags);
    const chips = page.root.querySelectorAll('ion-chip');
    expect(chips).toBeTruthy();
    expect(chips).toHaveLength(expectedTags.length);
  });

  it('uses suggestions', async () => {
    const expectedTags = ['tag1', 'tag2'];
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input suggestions={expectedTags}></tags-input>),
    });
    const component = page.rootInstance as TagsInput;
    expect(component.value).toEqual([]);
    expect(component.suggestions).toEqual(expectedTags);
    const chips = page.root.querySelectorAll('ion-chip');
    expect(chips).toBeTruthy();
    expect(chips).toHaveLength(expectedTags.length);
  });
});
