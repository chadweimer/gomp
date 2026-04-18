import { render, h, describe, it, expect, vi } from '@stencil/vitest';

describe('tags-input', () => {
  it('builds', async () => {
    const { root } = await render(<tags-input />);
    expect(root).toHaveClass('hydrated');
  });

  it('default no label', async () => {
    const { root } = await render(<tags-input />);
    expect(root).toHaveProperty('label', undefined);
    const label = root.querySelector('ion-label');
    expect(label).toBeNull();
  });

  it('label is used', async () => {
    const expectedLabel = 'My Label';
    const { root } = await render(<tags-input label={expectedLabel} />);
    expect(root).toHaveProperty('label', expectedLabel);
    const label = root.querySelector('ion-label');
    expect(label).toEqualText(expectedLabel);
  });

  it('label placement is used', async () => {
    const expectedLabel = 'My Label';
    const { root } = await render(<tags-input label={expectedLabel} label-placement="fixed" />);
    expect(root).toHaveProperty('label', expectedLabel);
    const label = root.querySelector('ion-label');
    expect(label).toEqualText(expectedLabel);
    expect(label).toHaveProperty('position', 'fixed');
  });

  it('uses tags', async () => {
    const expectedTags = ['tag1', 'tag2'];
    const { root } = await render(<tags-input value={expectedTags} />);
    expect(root).toHaveProperty('value', expectedTags);
    const chips = root.querySelectorAll('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(expectedTags.length);
  });

  it('uses suggestions', async () => {
    const expectedTags = ['tag1', 'tag2'];
    const { root } = await render<HTMLTagsInputElement>(<tags-input suggestions={expectedTags} />);
    expect(root.value.length).toBe(0);
    expect(root).toHaveProperty('suggestions', expectedTags);
    const chips = root.querySelectorAll('ion-chip.suggested');
    expect(chips).toHaveLength(expectedTags.length);
  });

  it('tag can be removed', async () => {
    const initialTags = ['tag1', 'tag2'];
    const handleValueChanged = vi.fn();
    const { root, waitForChanges } = await render(<tags-input value={initialTags} onValueChanged={handleValueChanged} />);
    let chips = root.querySelectorAll('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(initialTags.length);
    chips.forEach(chip => chip.dispatchEvent(new MouseEvent('click')));
    await waitForChanges();
    chips = root.querySelectorAll('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(0);
    expect(handleValueChanged).toHaveBeenCalledTimes(initialTags.length);
  });

  it('tag can be added', async () => {
    const expectedTags = ['tag1', 'tag2'];
    const handleValueChanged = vi.fn();
    const { root, waitForChanges } = await render(<tags-input onValueChanged={handleValueChanged} />);
    expect(root).toHaveProperty('value');
    const input = root.querySelector<HTMLInputElement>('ion-input');
    expect(input).not.toBeNull();
    for (const tag of expectedTags) {
      input!.value = tag;
      input!.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
      await waitForChanges();
      expect(input).toHaveProperty('value', '');
    }
    const addedChips = root.querySelectorAll('ion-chip:not(.suggested)');
    expect(addedChips).toHaveLength(expectedTags.length);
    expect(handleValueChanged).toHaveBeenCalledTimes(expectedTags.length);
  });

  it('suggestions can be added', async () => {
    const initialSuggestions = ['tag1', 'tag2'];
    const handleValueChanged = vi.fn();
    const { root, waitForChanges } = await render(<tags-input suggestions={initialSuggestions} onValueChanged={handleValueChanged} />);
    let suggestedChips = root.querySelectorAll('ion-chip.suggested');
    expect(suggestedChips).toHaveLength(initialSuggestions.length);
    suggestedChips.forEach(chip => chip.dispatchEvent(new MouseEvent('click')));
    await waitForChanges();
    suggestedChips = root.querySelectorAll('ion-chip.suggested');
    expect(suggestedChips).toHaveLength(0);
    const addedChips = root.querySelectorAll('ion-chip:not(.suggested)');
    expect(addedChips).toHaveLength(initialSuggestions.length);
    expect(handleValueChanged).toHaveBeenCalledTimes(initialSuggestions.length);
  });
});
