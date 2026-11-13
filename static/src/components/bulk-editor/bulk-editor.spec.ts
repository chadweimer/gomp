import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, vi } from 'vitest';
import { RecipeState } from '../../helpers/schema.gen';
import './bulk-editor';
import { BulkEditor } from './bulk-editor';

describe('bulk-editor', () => {
  async function createEditor(count = 5) {
    const modal = await fixture<HTMLIonModalElement>(html`
      <ion-modal>
        <bulk-editor .count=${count} .favoriteTags=${['quick', 'dinner']}></bulk-editor>
      </ion-modal>
    `);
    modal.dismiss = vi.fn().mockResolvedValue(true);
    const el = modal.querySelector<BulkEditor>('bulk-editor')!;
    await el.updateComplete;
    return { modal, el };
  }

  it('renders title with count', async () => {
    const { el } = await createEditor(3);
    const title = el.renderRoot.querySelector('ion-title');
    expect(title?.textContent).toContain('Edit Recipes (3)');
  });

  it('renders state select with Active and Archived options', async () => {
    const { el } = await createEditor(3);
    const select = el.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="State"]');
    expect(select).not.toBeNull();
    const options = select?.querySelectorAll('ion-select-option');
    expect(options).toHaveLength(3);
  });

  it('dismisses modal on cancel', async () => {
    const { modal, el } = await createEditor(3);
    const cancelBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="danger"]');
    cancelBtn?.click();
    expect(modal.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
  });

  it('dismisses modal with state, addTags and removeTags on save', async () => {
    const { modal, el } = await createEditor(3);
    const select = el.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="State"]');
    select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: RecipeState.Archived } }));

    const tagsInputs = el.renderRoot.querySelectorAll('tags-input');
    expect(tagsInputs.length).toBe(2);

    tagsInputs[0].dispatchEvent(new CustomEvent('valueChanged', { detail: ['healthy', 'dinner'] }));
    tagsInputs[1].dispatchEvent(new CustomEvent('valueChanged', { detail: ['junk'] }));
    await el.updateComplete;

    const saveBtn = el.renderRoot.querySelector<HTMLIonButtonElement>('ion-button[color="primary"]');
    saveBtn?.click();

    expect(modal.dismiss).toHaveBeenCalledWith(
      {
        state: RecipeState.Archived,
        addTags: ['healthy', 'dinner'],
        removeTags: ['junk'],
      },
      'save'
    );
  });
});
