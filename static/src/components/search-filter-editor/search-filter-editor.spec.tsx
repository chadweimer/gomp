import { render, h, describe, it, expect, beforeEach, afterEach, vi } from '@stencil/vitest';
import { alertController } from '@ionic/core';
import { fetchMocker } from '../../../vitest.setup';
import { RecipeState, SavedSearchFilter, SavedSearchFilterCompact, SearchField, SearchFilter, SortBy, SortDir, UserSettings, YesNoAny } from '../../helpers/schema.gen';
import { getDefaultSearchFilter } from '../../models';
import { clearState } from '../../stores/state';
import './search-filter-editor';
import { toYesNoAny } from '../../helpers/utils';

describe('search-filter-editor', () => {
  const originalFetch = globalThis.fetch;
  let modalEl: HTMLIonModalElement;

  const mockSettings: UserSettings = {
    userId: 1,
    homeTitle: 'My Home',
    homeImageUrl: 'http://example.com/image.jpg',
    favoriteTags: ['breakfast', 'quick', 'dinner'],
  };

  const mockFilters: SavedSearchFilterCompact[] = [
    { id: 1, name: 'Quick Dinners' },
    { id: 2, name: 'Desserts' },
  ];

  const mockLoadedFilter: SavedSearchFilter = {
    id: 1,
    name: 'Quick Dinners',
    query: 'chicken',
    withPictures: true,
    sortBy: SortBy.Rating,
    sortDir: SortDir.Desc,
    fields: [SearchField.Name],
    states: [RecipeState.Active],
    tags: ['quick'],
  };

  let currentSettings: UserSettings | null = mockSettings;
  let currentFilters: SavedSearchFilterCompact[] | null = mockFilters;
  let currentFilterDetail: SavedSearchFilter | null = mockLoadedFilter;

  function mockAlert(role = 'confirm'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  function syncInputValues(root: HTMLSearchFilterEditorElement) {
    const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
    if (nameInput) {
      nameInput.value = root.name;
    }
    const queryInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
    if (queryInput) {
      queryInput.value = root.searchFilter?.query ?? '';
    }
  }

  async function callCanDismiss(
    modal: HTMLIonModalElement,
    data?: unknown,
    role?: string,
  ): Promise<boolean | undefined> {
    if (typeof modal.canDismiss === 'function') {
      return await modal.canDismiss(data, role);
    }
    return modal.canDismiss;
  }

  beforeEach(() => {
    fetchMocker.resetMocks();
    clearState();
    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);

    currentSettings = mockSettings;
    currentFilters = mockFilters;
    currentFilterDetail = mockLoadedFilter;

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        if (currentSettings === null) {
          return { status: 500, body: JSON.stringify({ message: 'Error' }) };
        }
        return { status: 200, body: JSON.stringify(currentSettings) };
      }
      if (req.url.match(/\/users\/current\/filters\/\d+$/) && req.method === 'GET') {
        if (currentFilterDetail === null) {
          return { status: 500, body: JSON.stringify({ message: 'Error' }) };
        }
        return { status: 200, body: JSON.stringify(currentFilterDetail) };
      }
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        if (currentFilters === null) {
          return { status: 500, body: JSON.stringify({ message: 'Error' }) };
        }
        return { status: 200, body: JSON.stringify({ total: currentFilters.length, filters: currentFilters }) };
      }
      return { status: 404, body: '' };
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    modalEl.remove();
    vi.restoreAllMocks();
  });

  describe('Suite 1: Initial Rendering & Default State', () => {
    it('builds and renders default state', async () => {
      const { root } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      expect(root).toHaveClass('hydrated');

      const defaultSearchFilter = getDefaultSearchFilter();

      const saveBtn = root.shadowRoot?.querySelector('ion-buttons[slot="primary"] ion-button');
      expect(saveBtn).not.toBeNull();
      expect(saveBtn).toEqualText('Save');

      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput).not.toBeNull();
      expect(nameInput).toEqualAttribute('value', '');
      expect(nameInput).toHaveAttribute('required');
      expect(nameInput).toHaveAttribute('autofocus');

      const queryInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      expect(queryInput).not.toBeNull();
      expect(queryInput).toEqualAttribute('value', defaultSearchFilter.query);

      const tagsInput = root.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput).not.toBeNull();
      expect(tagsInput?.value).toEqual([]);

      const sortBySelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Sort By"]');
      expect(sortBySelect).not.toBeNull();
      expect(sortBySelect).toEqualAttribute('value', defaultSearchFilter.sortBy);

      const sortDirSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Sort Order"]');
      expect(sortDirSelect).not.toBeNull();
      expect(sortDirSelect).toEqualAttribute('value', defaultSearchFilter.sortDir);

      const picturesSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Pictures"]');
      expect(picturesSelect).not.toBeNull();
      expect(picturesSelect).toEqualAttribute('value', toYesNoAny(defaultSearchFilter.withPictures));

      const statesSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="States"]');
      expect(statesSelect).not.toBeNull();
      expect(statesSelect).toHaveAttribute('multiple');
      expect(statesSelect?.value).toEqual(defaultSearchFilter.states);

      const fieldsSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Fields to Search"]');
      expect(fieldsSelect).not.toBeNull();
      expect(fieldsSelect).toHaveAttribute('multiple');
      expect(fieldsSelect?.value).toEqual(defaultSearchFilter.fields);

      const loader = root.shadowRoot?.querySelector('#savedSearchLoader');
      expect(loader).toBeNull();
    });

    it('renders with custom props', async () => {
      const customFilter: SearchFilter = {
        query: 'tacos',
        tags: ['mexican'],
        sortBy: SortBy.Rating,
        sortDir: SortDir.Desc,
        withPictures: true,
        states: [RecipeState.Archived],
        fields: [SearchField.Directions],
      };

      const { root } = await render<HTMLSearchFilterEditorElement>(
        <search-filter-editor
          prompt="Find Dinner"
          saveLabel="Apply"
          name="Taco Night"
          searchFilter={customFilter}
        />,
      );

      const title = root.shadowRoot?.querySelector('ion-title');
      expect(title).toEqualText('Find Dinner');

      const saveBtn = root.shadowRoot?.querySelector('ion-buttons[slot="primary"] ion-button');
      expect(saveBtn).toEqualText('Apply');

      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput).toEqualAttribute('value', 'Taco Night');

      const queryInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      expect(queryInput).toEqualAttribute('value', 'tacos');

      const tagsInput = root.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput?.value).toEqual(['mexican']);

      const sortBySelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Sort By"]');
      expect(sortBySelect).toEqualAttribute('value', SortBy.Rating);

      const sortDirSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Sort Order"]');
      expect(sortDirSelect).toEqualAttribute('value', SortDir.Desc);

      const picturesSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Pictures"]');
      expect(picturesSelect).toEqualAttribute('value', YesNoAny.Yes);

      const statesSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="States"]');
      expect(statesSelect?.value).toEqual([RecipeState.Archived]);

      const fieldsSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Fields to Search"]');
      expect(fieldsSelect?.value).toEqual([SearchField.Directions]);
    });

    it('hides name input when hideName is true', async () => {
      const { root } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor hideName={true} />);
      const nameInput = root.shadowRoot?.querySelector('ion-input[label="Name"]');
      expect(nameInput).toBeNull();
    });

    it('prevents default form submission', async () => {
      const { root } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const form = root.shadowRoot?.querySelector('form');
      expect(form).not.toBeNull();

      const submitEvent = new CustomEvent('submit', { cancelable: true });
      const wasPrevented = !form?.dispatchEvent(submitEvent);
      expect(wasPrevented).toBe(true);
    });
  });

  describe('Suite 2: User Settings & Suggestions', () => {
    it('populates tag suggestions from user settings', async () => {
      const { root } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const tagsInput = root.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual(['breakfast', 'quick', 'dinner']);
    });

    it('falls back to empty suggestions when loadUserSettings fails', async () => {
      currentSettings = null;

      let lifecycleError: unknown;
      try {
        await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      } catch (err) {
        lifecycleError = err;
      }
      expect(lifecycleError).toBeDefined();

      const root = document.querySelector('search-filter-editor');
      expect(root).not.toBeNull();
      expect(root).toHaveClass('hydrated');

      const tagsInput = root?.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual([]);
    });

    it('handles user settings without favorite tags', async () => {
      currentSettings = {
        userId: 1,
        homeTitle: 'My Home',
        homeImageUrl: '',
        favoriteTags: [],
      };

      const { root } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const tagsInput = root.shadowRoot?.querySelector<HTMLTagsInputElement>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual([]);
    });
  });

  describe('Suite 3: Saved Search Loader', () => {
    it('renders saved search options and open button disabled initially', async () => {
      const { root } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor showSavedLoader={true} />);
      const loader = root.shadowRoot?.querySelector('#savedSearchLoader');
      expect(loader).not.toBeNull();

      const options = loader?.querySelectorAll('ion-select-option');
      expect(options).toHaveLength(2);
      expect(options?.[0]).toEqualText('Quick Dinners');
      expect(options?.[0]).toEqualAttribute('value', '1');
      expect(options?.[1]).toEqualText('Desserts');
      expect(options?.[1]).toEqualAttribute('value', '2');

      const openBtn = loader?.querySelector<HTMLIonButtonElement>('ion-button');
      expect(openBtn).toHaveAttribute('disabled');
    });

    it('handles failure when loading saved search filters list', async () => {
      currentFilters = null;

      let lifecycleError: unknown;
      try {
        await render<HTMLSearchFilterEditorElement>(<search-filter-editor showSavedLoader={true} />);
      } catch (err) {
        lifecycleError = err;
      }
      expect(lifecycleError).toBeDefined();

      const root = document.querySelector('search-filter-editor');
      expect(root).not.toBeNull();
      expect(root).toHaveClass('hydrated');

      const options = root?.shadowRoot?.querySelectorAll('#savedSearchLoader ion-select-option');
      expect(options).toHaveLength(0);
    });

    it('enables open button on select and loads filter on click', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(
        <search-filter-editor showSavedLoader={true} />,
      );

      const select = root.shadowRoot?.querySelector<HTMLIonSelectElement>('#savedSearchLoader ion-select');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 1 } }));
      await waitForChanges();

      const openBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('#savedSearchLoader ion-button');
      expect(openBtn).not.toHaveAttribute('disabled');

      openBtn?.click();
      await waitForChanges();

      await vi.waitFor(() => {
        expect(root.searchFilter).toEqual(mockLoadedFilter);
      });
      expect(openBtn).toHaveAttribute('disabled');
    });

    it('handles error when loading a selected filter fails', async () => {
      currentFilterDetail = null;

      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(
        <search-filter-editor showSavedLoader={true} />,
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const select = root.shadowRoot?.querySelector<HTMLIonSelectElement>('#savedSearchLoader ion-select');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 1 } }));
      await waitForChanges();

      const openBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('#savedSearchLoader ion-button');
      openBtn?.click();
      await waitForChanges();

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      expect(root.searchFilter.query).toBe('');
    });

    it('does nothing when open button is clicked without selected filter', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(
        <search-filter-editor showSavedLoader={true} />,
      );

      const openBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>('#savedSearchLoader ion-button');
      openBtn?.click();
      await waitForChanges();

      const detailRequests = (fetchMocker.requests() as Request[]).filter(r =>
        r.url.match(/\/users\/current\/filters\/\d+$/),
      );
      expect(detailRequests).toHaveLength(0);
    });
  });

  describe('Suite 4: Form Input Updates & Change Events', () => {
    it('updates name on ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');

      nameInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'Curry Dishes' } }));
      await waitForChanges();

      expect(root.name).toBe('Curry Dishes');
    });

    it('updates search terms query on ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const queryInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');

      queryInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'curry' } }));
      await waitForChanges();

      expect(root.searchFilter.query).toBe('curry');
    });

    it('updates tags on valueChanged', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const tagsInput = root.shadowRoot?.querySelector('tags-input[label="Tags"]');

      tagsInput?.dispatchEvent(new CustomEvent('valueChanged', { detail: ['asian', 'spicy'] }));
      await waitForChanges();

      expect(root.searchFilter.tags).toEqual(['asian', 'spicy']);
    });

    it('updates sortBy on ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const sortBySelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Sort By"]');

      sortBySelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: SortBy.Rating } }));
      await waitForChanges();

      expect(root.searchFilter.sortBy).toBe(SortBy.Rating);
    });

    it('updates sortDir on ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const sortDirSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Sort Order"]');

      sortDirSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: SortDir.Desc } }));
      await waitForChanges();

      expect(root.searchFilter.sortDir).toBe(SortDir.Desc);
    });

    it('updates withPictures on ionChange for Yes, No, and Any', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const picturesSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Pictures"]');

      picturesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: YesNoAny.Yes } }));
      await waitForChanges();
      expect(root.searchFilter.withPictures).toBe(true);

      picturesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: YesNoAny.No } }));
      await waitForChanges();
      expect(root.searchFilter.withPictures).toBe(false);

      picturesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: YesNoAny.Any } }));
      await waitForChanges();
      expect(root.searchFilter.withPictures).toBeNull();
    });

    it('updates states on ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const statesSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="States"]');

      statesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: [RecipeState.Archived] } }));
      await waitForChanges();

      expect(root.searchFilter.states).toEqual([RecipeState.Archived]);
    });

    it('updates fields on ionChange', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      const fieldsSelect = root.shadowRoot?.querySelector<HTMLIonSelectElement>('ion-select[label="Fields to Search"]');

      fieldsSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: [SearchField.Directions] } }));
      await waitForChanges();

      expect(root.searchFilter.fields).toEqual([SearchField.Directions]);
    });
  });

  describe('Suite 5: Actions (Reset, Cancel, and Save)', () => {
    it('resets search filter to default values when Reset is clicked', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);

      root.searchFilter = {
        ...root.searchFilter,
        query: 'pizza',
        sortBy: SortBy.Created,
        sortDir: SortDir.Desc,
      };
      await waitForChanges();

      const resetBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="secondary"] ion-button:first-of-type',
      );
      resetBtn?.click();
      await waitForChanges();

      expect(root.searchFilter).toEqual(getDefaultSearchFilter());
    });

    it('dismisses modal with undefined on cancel', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const cancelBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="secondary"] ion-button:last-of-type',
      );
      cancelBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });

    it('dismisses modal with name and searchFilter when form is valid', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      root.name = 'My Filter';
      root.searchFilter = { ...getDefaultSearchFilter(), query: 'soup' };
      await waitForChanges();

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="primary"] ion-button',
      );
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).toHaveBeenCalledWith({
        name: 'My Filter',
        searchFilter: root.searchFilter,
      }, 'save');
    });

    it('does not dismiss modal when form validation fails', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();

      const form = root.shadowRoot?.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = root.shadowRoot?.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="primary"] ion-button',
      );
      saveBtn?.click();
      await waitForChanges();

      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });
  });

  describe('Suite 6: Modal canDismiss & Dirty State Detection', () => {
    it('allows dismissal without confirmation when role is save', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      root.name = 'Modified Name';

      const canDismiss = await callCanDismiss(modalEl, undefined, 'save');
      expect(canDismiss).toBe(true);
    });

    it('allows dismissal without confirmation when clean', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });

    it('detects dirty state when name input value changed and confirms discard', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      if (nameInput) {
        nameInput.value = 'Unsaved Name';
      }

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('blocks dismissal when user cancels discard alert', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const nameInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      if (nameInput) {
        nameInput.value = 'Unsaved Name';
      }

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(false);
    });

    it('detects dirty state when query input value changed', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const queryInput = root.shadowRoot?.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      if (queryInput) {
        queryInput.value = 'Unsaved Query';
      }

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('detects dirty state when filter properties change', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(<search-filter-editor />);
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      // sortBy
      root.searchFilter = { ...root.searchFilter, sortBy: SortBy.Rating };
      expect(await callCanDismiss(modalEl, undefined, 'cancel')).toBe(true);

      // sortDir
      root.searchFilter = { ...root.searchFilter, sortDir: SortDir.Desc };
      expect(await callCanDismiss(modalEl, undefined, 'cancel')).toBe(true);

      // withPictures
      root.searchFilter = { ...root.searchFilter, withPictures: true };
      expect(await callCanDismiss(modalEl, undefined, 'cancel')).toBe(true);

      // states
      root.searchFilter = { ...root.searchFilter, states: [RecipeState.Archived] };
      expect(await callCanDismiss(modalEl, undefined, 'cancel')).toBe(true);

      // fields
      root.searchFilter = { ...root.searchFilter, fields: [SearchField.Directions] };
      expect(await callCanDismiss(modalEl, undefined, 'cancel')).toBe(true);

      // tags
      root.searchFilter = { ...root.searchFilter, tags: ['newTag'] };
      expect(await callCanDismiss(modalEl, undefined, 'cancel')).toBe(true);

      expect(createAlertSpy).toHaveBeenCalledTimes(6);
    });

    it('treats reordered tags as equal and clean', async () => {
      const initialFilter = { ...getDefaultSearchFilter(), tags: ['beta', 'alpha'] };
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(
        <search-filter-editor searchFilter={initialFilter} />,
      );
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      const createAlertSpy = vi.spyOn(alertController, 'create');

      root.searchFilter = { ...root.searchFilter, tags: ['alpha', 'beta'] };
      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');

      expect(canDismiss).toBe(true);
      expect(createAlertSpy).not.toHaveBeenCalled();
    });

    it('handles canDismiss safely when hideName is true', async () => {
      const { root, waitForChanges } = await render<HTMLSearchFilterEditorElement>(
        <search-filter-editor hideName={true} />,
      );
      modalEl.appendChild(root);
      await waitForChanges();
      syncInputValues(root);

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });
  });
});
