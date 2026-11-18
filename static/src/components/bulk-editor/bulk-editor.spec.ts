import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { alertController } from '@ionic/core';
import { RecipeState } from '../../helpers/schema.gen';
import './bulk-editor';
import { BulkEditor } from './bulk-editor';

describe('bulk-editor', () => {
  function mockAlert(role = 'destructive'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  async function callCanDismiss(modal: HTMLIonModalElement, data?: unknown, role?: string): Promise<boolean | undefined> {
    if (typeof modal.canDismiss === 'function') {
      return await modal.canDismiss(data, role);
    }
    return modal.canDismiss;
  }

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(tagsInputs).toHaveLength(2);

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

  describe('dirty state detection and canDismiss', () => {
    it('allows dismissal without confirmation when clean initially or when saving', async () => {
      const { modal } = await createEditor(3);

      expect(await callCanDismiss(modal, undefined, 'save')).toBe(true);
      expect(await callCanDismiss(modal, undefined, 'cancel')).toBe(true);
    });

    it('evaluates clean when "No change" is selected', async () => {
      const { modal, el } = await createEditor(3);
      const select = el.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="State"]');

      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '' } }));
      await el.updateComplete;

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });

    it('detects dirty state when state is set to Active or Archived and resets to clean on "No change"', async () => {
      const { modal, el } = await createEditor(3);
      const select = el.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="State"]');
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: RecipeState.Active } }));
      await el.updateComplete;

      expect(await callCanDismiss(modal, undefined, 'cancel')).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));

      createAlertSpy.mockClear();

      // Resetting to "No change" makes it clean again
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '' } }));
      await el.updateComplete;

      expect(await callCanDismiss(modal, undefined, 'cancel')).toBe(true);
      expect(createAlertSpy).not.toHaveBeenCalled();
    });

    it.each([
      { tagType: 'addTags', index: 0, tags: ['spicy'] },
      { tagType: 'removeTags', index: 1, tags: ['bland'] },
    ])('detects dirty state when $tagType are modified', async ({ index, tags }) => {
      const { modal, el } = await createEditor(3);
      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const tagsInputs = el.renderRoot.querySelectorAll('tags-input');
      tagsInputs[index].dispatchEvent(new CustomEvent('valueChanged', { detail: tags }));
      await el.updateComplete;

      expect(await callCanDismiss(modal, undefined, 'cancel')).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('blocks dismissal when user cancels discard prompt', async () => {
      const { modal, el } = await createEditor(3);
      const select = el.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="State"]');
      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: RecipeState.Archived } }));
      await el.updateComplete;

      const canDismiss = await callCanDismiss(modal, undefined, 'cancel');
      expect(canDismiss).toBe(false);
    });
  });
});
