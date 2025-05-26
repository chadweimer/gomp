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
    const input = page.root.shadowRoot.querySelector('ion-input');
    expect(input).not.toBeNull();
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
    const input = page.root.shadowRoot.querySelector('ion-input');
    expect(input).not.toBeNull();
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
    const chips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
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
    const chips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip.suggested');
    expect(chips).toHaveLength(expectedTags.length);
  });

  it('tag can be removed', async () => {
    const initialTags = ['tag1', 'tag2'];
    const handleValueChanged = jest.fn();
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input value={initialTags} onValueChanged={handleValueChanged}></tags-input>),
    });
    let chips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(initialTags.length);
    chips.forEach(chip => chip.click());
    await page.waitForChanges();
    const component = page.rootInstance as TagsInput;
    expect(component.internalValue).toEqual([]);
    chips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(0);
    expect(handleValueChanged).toHaveBeenCalledTimes(initialTags.length);
  });

  it('tag can be added', async () => {
    const expectedTags = ['tag1', 'tag2'];
    const handleValueChanged = jest.fn();
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input onValueChanged={handleValueChanged}></tags-input>),
    });
    const component = page.rootInstance as TagsInput;
    expect(component.value).toEqual([]);
    const input = page.root.shadowRoot.querySelector('ion-input');
    expect(input).not.toBeNull();
    for (const tag of expectedTags) {
      input.value = tag;
      input.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
      await page.waitForChanges();
      expect(input.value).toEqualText('');
    }
    const addedChips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
    expect(addedChips).toHaveLength(expectedTags.length);
    expect(handleValueChanged).toHaveBeenCalledTimes(expectedTags.length);
    expect(component.internalValue).toEqual(expectedTags);
  });

  it('suggestions can be added', async () => {
    const initialSuggestions = ['tag1', 'tag2'];
    const handleValueChanged = jest.fn();
    const page = await newSpecPage({
      components: [TagsInput],
      template: () => (<tags-input suggestions={initialSuggestions} onValueChanged={handleValueChanged}></tags-input>),
    });
    let suggestedChips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip.suggested');
    expect(suggestedChips).toHaveLength(initialSuggestions.length);
    suggestedChips.forEach(chip => chip.click());
    await page.waitForChanges();
    const component = page.rootInstance as TagsInput;
    expect(component.internalValue).toEqual(initialSuggestions);
    suggestedChips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip.suggested');
    expect(suggestedChips).toHaveLength(0);
    const addedChips = page.root.shadowRoot.querySelectorAll<HTMLIonChipElement>('ion-chip:not(.suggested)');
    expect(addedChips).toHaveLength(initialSuggestions.length);
    expect(handleValueChanged).toHaveBeenCalledTimes(initialSuggestions.length);
  });
});
