import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import './tags-input';
import { TagsInput } from './tags-input';

describe('tags-input', () => {
  it('renders default with no label', async () => {
    const el = await fixture<TagsInput>(html`<tags-input></tags-input>`);
    const label = el.renderRoot.querySelector('ion-label');
    expect(label).toBeNull();
  });

  it('renders label and label placement', async () => {
    const el = await fixture<TagsInput>(html`<tags-input label="My Label" label-placement="fixed"></tags-input>`);
    const label = el.renderRoot.querySelector('ion-label');
    expect(label?.textContent?.trim()).toBe('My Label');
    expect(label?.getAttribute('position')).toBe('fixed');
  });

  it('renders initial tags', async () => {
    const el = await fixture<TagsInput>(html`<tags-input .value=${['tag1', 'tag2']}></tags-input>`);
    const chips = el.renderRoot.querySelectorAll('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(2);
  });

  it('renders suggestions excluding active tags', async () => {
    const el = await fixture<TagsInput>(html`<tags-input .value=${['tag1']} .suggestions=${['tag1', 'tag2', 'tag3']}></tags-input>`);
    const suggestedChips = el.renderRoot.querySelectorAll('ion-chip.suggested');
    expect(suggestedChips).toHaveLength(2);
  });

  it('removes tag on chip click', async () => {
    const onValueChanged = vi.fn();
    const el = await fixture<TagsInput>(html`<tags-input .value=${['tag1', 'tag2']}></tags-input>`);
    el.addEventListener('valueChanged', (e: Event) => onValueChanged((e as CustomEvent).detail));

    const firstChip = el.renderRoot.querySelector<HTMLIonChipElement>('ion-chip:not(.suggested)');
    firstChip?.click();
    await el.updateComplete;

    expect(onValueChanged).toHaveBeenCalledWith(['tag2']);
    const chips = el.renderRoot.querySelectorAll('ion-chip:not(.suggested)');
    expect(chips).toHaveLength(1);
  });

  it('adds tag programmatically and from suggestions', async () => {
    const onValueChanged = vi.fn();
    const el = await fixture<TagsInput>(html`<tags-input .suggestions=${['sug1']}></tags-input>`);
    el.addEventListener('valueChanged', (e: Event) => onValueChanged((e as CustomEvent).detail));

    el.addTag('new-tag');
    expect(onValueChanged).toHaveBeenCalledWith(['new-tag']);

    const sugChip = el.renderRoot.querySelector<HTMLIonChipElement>('ion-chip.suggested');
    sugChip?.click();
    await el.updateComplete;

    expect(onValueChanged).toHaveBeenCalledWith(['new-tag', 'sug1']);
  });

  it('adds tag on Enter keydown from slotted input', async () => {
    const onValueChanged = vi.fn();
    const el = await fixture<TagsInput>(html`
      <tags-input>
        <input type="text" />
      </tags-input>
    `);
    el.addEventListener('valueChanged', (e: Event) => onValueChanged((e as CustomEvent).detail));

    const input = el.querySelector('input')!;
    input.value = 'typed-tag';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await el.updateComplete;

    expect(onValueChanged).toHaveBeenCalledWith(['typed-tag']);
    expect(input.value).toBe('');
  });
});
