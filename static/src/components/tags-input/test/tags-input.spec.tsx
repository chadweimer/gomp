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
    const input = page.root.querySelector('ion-input');
    expect(input).toBeTruthy();
    expect(input.getAttribute('label')).toEqualText(expectedLabel);
  });

  it('label is used', async () => {
    const expectedLabel = 'My Label';
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input label={expectedLabel}></tags-input>),
    });
    const component = page.rootInstance as TagsInput;
    expect(component.label).toEqual(expectedLabel);
    const input = page.root.querySelector('ion-input');
    expect(input).toBeTruthy();
    expect(input.getAttribute('label')).toEqualText(expectedLabel);
  });

  it('uses tags', async () => {
    const expectedTags = ['tag1', 'tag2'];
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input value={expectedTags}></tags-input>),
    });
    const component = page.rootInstance as TagsInput;
    expect(component.value).toEqual(expectedTags);
    const chips = page.root.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
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
    const chips = page.root.querySelectorAll<HTMLIonChipElement>('ion-chip.suggested');
    expect(chips).toBeTruthy();
    expect(chips).toHaveLength(expectedTags.length);
  });

  it('tag can be removed', async () => {
    const initialTags = ['tag1', 'tag2'];
    const handleValueChanged = jest.fn();
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input value={initialTags} onValueChanged={handleValueChanged}></tags-input>),
    });
    let chips = page.root.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
    expect(chips).toBeTruthy();
    chips.forEach(chip => chip.click());
    await page.waitForChanges();
    const component = page.rootInstance as TagsInput;
    expect(component.internalValue).toEqual([]);
    chips = page.root.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(0);
    expect(handleValueChanged).toHaveBeenCalledTimes(initialTags.length);
  });

  it('suggestions can be added', async () => {
    const initialSuggestions = ['tag1', 'tag2'];
    const handleValueChanged = jest.fn();
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input suggestions={initialSuggestions} onValueChanged={handleValueChanged}></tags-input>),
    });
    let suggestedChips = page.root.querySelectorAll<HTMLIonChipElement>('ion-chip.suggested');
    expect(suggestedChips).toHaveLength(initialSuggestions.length);
    suggestedChips.forEach(chip => chip.click());
    await page.waitForChanges();
    const component = page.rootInstance as TagsInput;
    expect(component.internalValue).toEqual(initialSuggestions);
    suggestedChips = page.root.querySelectorAll<HTMLIonChipElement>('ion-chip.suggested');
    expect(suggestedChips).toHaveLength(0);
    const addedChips = page.root.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
    expect(addedChips).toHaveLength(initialSuggestions.length);
    expect(handleValueChanged).toHaveBeenCalledTimes(initialSuggestions.length);
  });
});
