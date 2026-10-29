import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertController } from '@ionic/core';
import { fetchMocker } from '../../../vitest.setup';
import {
  RecipeState,
  SavedSearchFilter,
  SavedSearchFilterCompact,
  SearchField,
  SearchFilter,
  SortBy,
  SortDir,
  UserSettings,
  YesNoAny,
} from '../../helpers/schema.gen';
import { getDefaultSearchFilter } from '../../models';
import { toYesNoAny } from '../../helpers/utils';
import { clearState } from '../../stores/state';
import './search-filter-editor';
import { SearchFilterEditor } from './search-filter-editor';
import { TagsInput } from '../tags-input/tags-input';

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

  function syncInputValues(root: SearchFilterEditor) {
    const nameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
    if (nameInput) {
      nameInput.value = root.name;
    }
    const queryInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
    if (queryInput) {
      queryInput.value = root.searchFilter?.query ?? '';
    }
  }

  async function callCanDismiss(
    modal: HTMLIonModalElement,
    data?: unknown,
    role?: string
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
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const defaultSearchFilter = getDefaultSearchFilter();

      const saveBtn = root.renderRoot.querySelector('ion-buttons[slot="primary"] ion-button');
      expect(saveBtn).not.toBeNull();
      expect(saveBtn?.textContent?.trim()).toBe('Save');

      const nameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput).toBeNull();

      const queryInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      expect(queryInput).not.toBeNull();
      expect(queryInput?.value).toBe(defaultSearchFilter.query);

      const tagsInput = root.renderRoot.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput).not.toBeNull();
      expect(tagsInput?.value).toEqual([]);

      const sortBySelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Sort By"]');
      expect(sortBySelect).not.toBeNull();
      expect(sortBySelect?.value).toBe(defaultSearchFilter.sortBy);

      const sortDirSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Sort Order"]');
      expect(sortDirSelect).not.toBeNull();
      expect(sortDirSelect?.value).toBe(defaultSearchFilter.sortDir);

      const picturesSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Pictures"]');
      expect(picturesSelect).not.toBeNull();
      expect(picturesSelect?.value).toBe(toYesNoAny(defaultSearchFilter.withPictures));

      const statesSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="States"]');
      expect(statesSelect).not.toBeNull();
      expect(statesSelect?.hasAttribute('multiple')).toBe(true);
      expect(statesSelect?.value).toEqual(defaultSearchFilter.states);

      const fieldsSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Fields to Search"]');
      expect(fieldsSelect).not.toBeNull();
      expect(fieldsSelect?.hasAttribute('multiple')).toBe(true);
      expect(fieldsSelect?.value).toEqual(defaultSearchFilter.fields);

      const loader = root.renderRoot.querySelector('#savedSearchLoader');
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

      const root = await fixture<SearchFilterEditor>(html`
        <search-filter-editor
          prompt="Find Dinner"
          saveLabel="Apply"
          name="Taco Night"
          .searchFilter=${customFilter}
          ?showName=${true}
        ></search-filter-editor>
      `);
      await root.updateComplete;

      const title = root.renderRoot.querySelector('ion-title');
      expect(title?.textContent?.trim()).toBe('Find Dinner');

      const saveBtn = root.renderRoot.querySelector('ion-buttons[slot="primary"] ion-button');
      expect(saveBtn?.textContent?.trim()).toBe('Apply');

      const nameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput?.value).toBe('Taco Night');

      const queryInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      expect(queryInput?.value).toBe('tacos');

      const tagsInput = root.renderRoot.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput?.value).toEqual(['mexican']);

      const sortBySelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Sort By"]');
      expect(sortBySelect?.value).toBe(SortBy.Rating);

      const sortDirSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Sort Order"]');
      expect(sortDirSelect?.value).toBe(SortDir.Desc);

      const picturesSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Pictures"]');
      expect(picturesSelect?.value).toBe(YesNoAny.Yes);

      const statesSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="States"]');
      expect(statesSelect?.value).toEqual([RecipeState.Archived]);

      const fieldsSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Fields to Search"]');
      expect(fieldsSelect?.value).toEqual([SearchField.Directions]);
    });

    it('shows name input when showName is true', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor .showName=${true}></search-filter-editor>`);
      await root.updateComplete;

      const nameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      expect(nameInput).not.toBeNull();

      expect(nameInput?.value).toBe('');
      expect(nameInput?.hasAttribute('required')).toBe(true);
      expect(nameInput?.hasAttribute('autofocus')).toBe(true);
    });

    it('prevents default form submission', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const form = root.renderRoot.querySelector('form');
      expect(form).not.toBeNull();

      const submitEvent = new CustomEvent('submit', { cancelable: true });
      const wasPrevented = !form?.dispatchEvent(submitEvent);
      expect(wasPrevented).toBe(true);
    });
  });

  describe('Suite 2: User Settings & Suggestions', () => {
    it('populates tag suggestions from user settings', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const tagsInput = root.renderRoot.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual(['breakfast', 'quick', 'dinner']);
    });

    it('falls back to empty suggestions when loadUserSettings fails', async () => {
      currentSettings = null;

      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const tagsInput = root.renderRoot.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual([]);
    });

    it('handles user settings without favorite tags', async () => {
      currentSettings = {
        userId: 1,
        homeTitle: 'My Home',
        homeImageUrl: '',
        favoriteTags: [],
      };

      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const tagsInput = root.renderRoot.querySelector<TagsInput>('tags-input[label="Tags"]');
      expect(tagsInput?.suggestions).toEqual([]);
    });
  });

  describe('Suite 3: Saved Search Loader', () => {
    it('renders saved search options and open button disabled initially', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor ?showSavedLoader=${true}></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const loader = root.renderRoot.querySelector('#savedSearchLoader');
      expect(loader).not.toBeNull();

      const options = loader?.querySelectorAll('ion-select-option');
      expect(options).toHaveLength(2);
      expect(options?.[0]?.textContent?.trim()).toBe('Quick Dinners');
      expect(options?.[0]?.value).toBe(1);
      expect(options?.[1]?.textContent?.trim()).toBe('Desserts');
      expect(options?.[1]?.value).toBe(2);

      const openBtn = loader?.querySelector<HTMLIonButtonElement>('ion-button');
      expect(openBtn?.hasAttribute('disabled')).toBe(true);
    });

    it('handles failure when loading saved search filters list', async () => {
      currentFilters = null;

      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor ?showSavedLoader=${true}></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const options = root.renderRoot.querySelectorAll('#savedSearchLoader ion-select-option');
      expect(options).toHaveLength(0);
    });

    it('enables open button on select and loads filter on click', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor ?showSavedLoader=${true}></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const select = root.renderRoot.querySelector<HTMLIonSelectElement>('#savedSearchLoader ion-select');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 1 } }));
      await root.updateComplete;

      const openBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('#savedSearchLoader ion-button');
      expect(openBtn?.hasAttribute('disabled')).toBe(false);

      openBtn?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(root.searchFilter).toEqual(mockLoadedFilter);
      expect(openBtn?.hasAttribute('disabled')).toBe(true);
    });

    it('handles error when loading a selected filter fails', async () => {
      currentFilterDetail = null;

      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor ?showSavedLoader=${true}></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      const select = root.renderRoot.querySelector<HTMLIonSelectElement>('#savedSearchLoader ion-select');
      select?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 1 } }));
      await root.updateComplete;

      const openBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('#savedSearchLoader ion-button');
      openBtn?.click();
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      expect(consoleSpy).toHaveBeenCalled();
      expect(root.searchFilter.query).toBe('');
    });

    it('does nothing when open button is clicked without selected filter', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor ?showSavedLoader=${true}></search-filter-editor>`);
      await new Promise((r) => setTimeout(r, 10));
      await root.updateComplete;

      const openBtn = root.renderRoot.querySelector<HTMLIonButtonElement>('#savedSearchLoader ion-button');
      openBtn?.click();
      await root.updateComplete;

      const detailRequests = fetchMocker.requests().filter((r) =>
        r.url.match(/\/users\/current\/filters\/\d+$/)
      );
      expect(detailRequests).toHaveLength(0);
    });
  });

  describe('Suite 4: Form Input Updates & Change Events', () => {
    it('updates name on ionChange', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor ?showName=${true}></search-filter-editor>`);
      await root.updateComplete;

      const nameInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Name"]');
      nameInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'Curry Dishes' } }));
      await root.updateComplete;

      expect(root.name).toBe('Curry Dishes');
    });

    it('updates search terms query on ionChange', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const queryInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      queryInput?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'curry' } }));
      await root.updateComplete;

      expect(root.searchFilter.query).toBe('curry');
    });

    it('updates tags on valueChanged', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const tagsInput = root.renderRoot.querySelector('tags-input[label="Tags"]');
      tagsInput?.dispatchEvent(new CustomEvent('valueChanged', { detail: ['asian', 'spicy'] }));
      await root.updateComplete;

      expect(root.searchFilter.tags).toEqual(['asian', 'spicy']);
    });

    it('updates sortBy on ionChange', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const sortBySelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Sort By"]');
      sortBySelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: SortBy.Rating } }));
      await root.updateComplete;

      expect(root.searchFilter.sortBy).toBe(SortBy.Rating);
    });

    it('updates sortDir on ionChange', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const sortDirSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Sort Order"]');
      sortDirSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: SortDir.Desc } }));
      await root.updateComplete;

      expect(root.searchFilter.sortDir).toBe(SortDir.Desc);
    });

    it('updates withPictures on ionChange for Yes, No, and Any', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const picturesSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Pictures"]');

      picturesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: YesNoAny.Yes } }));
      await root.updateComplete;
      expect(root.searchFilter.withPictures).toBe(true);

      picturesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: YesNoAny.No } }));
      await root.updateComplete;
      expect(root.searchFilter.withPictures).toBe(false);

      picturesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: YesNoAny.Any } }));
      await root.updateComplete;
      expect(root.searchFilter.withPictures).toBeNull();
    });

    it('updates states on ionChange', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const statesSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="States"]');
      statesSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: [RecipeState.Archived] } }));
      await root.updateComplete;

      expect(root.searchFilter.states).toEqual([RecipeState.Archived]);
    });

    it('updates fields on ionChange', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      const fieldsSelect = root.renderRoot.querySelector<HTMLIonSelectElement>('ion-select[label="Fields to Search"]');
      fieldsSelect?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: [SearchField.Directions] } }));
      await root.updateComplete;

      expect(root.searchFilter.fields).toEqual([SearchField.Directions]);
    });
  });

  describe('Suite 5: Actions (Reset, Cancel, and Save)', () => {
    it('resets search filter to default values when Reset is clicked', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      await root.updateComplete;

      root.searchFilter = {
        ...root.searchFilter,
        query: 'pizza',
        sortBy: SortBy.Created,
        sortDir: SortDir.Desc,
      };
      await root.updateComplete;

      const resetBtn = root.renderRoot.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="secondary"] ion-button:first-of-type'
      );
      resetBtn?.click();
      await root.updateComplete;

      expect(root.searchFilter).toEqual(getDefaultSearchFilter());
    });

    it('dismisses modal with undefined on cancel', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;

      const cancelBtn = root.renderRoot.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="secondary"] ion-button:last-of-type'
      );
      cancelBtn?.click();
      await root.updateComplete;

      expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
    });

    it('dismisses modal with name and searchFilter when form is valid', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;

      root.name = 'My Filter';
      root.searchFilter = { ...getDefaultSearchFilter(), query: 'soup' };
      await root.updateComplete;

      const saveBtn = root.renderRoot.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="primary"] ion-button'
      );
      saveBtn?.click();
      await root.updateComplete;

      expect(modalEl.dismiss).toHaveBeenCalledWith(
        {
          name: 'My Filter',
          searchFilter: root.searchFilter,
        },
        'save'
      );
    });

    it('does not dismiss modal when form validation fails', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;

      const form = root.renderRoot.querySelector('form');
      if (form) {
        vi.spyOn(form, 'reportValidity').mockReturnValue(false);
      }

      const saveBtn = root.renderRoot.querySelector<HTMLIonButtonElement>(
        'ion-buttons[slot="primary"] ion-button'
      );
      saveBtn?.click();
      await root.updateComplete;

      expect(modalEl.dismiss).not.toHaveBeenCalled();
    });
  });

  describe('Suite 6: Modal canDismiss & Dirty State Detection', () => {
    it('allows dismissal without confirmation when role is save', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;
      syncInputValues(root);

      root.name = 'Modified Name';

      const canDismiss = await callCanDismiss(modalEl, undefined, 'save');
      expect(canDismiss).toBe(true);
    });

    it('allows dismissal without confirmation when clean', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;
      syncInputValues(root);

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });

    it('detects dirty state when name input value changed and confirms discard', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;
      syncInputValues(root);

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const queryInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      if (queryInput) {
        queryInput.value = 'Unsaved Query';
      }

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('blocks dismissal when user cancels discard alert', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;
      syncInputValues(root);

      vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('cancel'));

      const queryInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      if (queryInput) {
        queryInput.value = 'Unsaved Query';
      }

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(false);
    });

    it('detects dirty state when query input value changed', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;
      syncInputValues(root);

      const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('destructive'));

      const queryInput = root.renderRoot.querySelector<HTMLIonInputElement>('ion-input[label="Search Terms"]');
      if (queryInput) {
        queryInput.value = 'Unsaved Query';
      }

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
      expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Discard Changes?' }));
    });

    it('detects dirty state when filter properties change', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;
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
      const root = await fixture<SearchFilterEditor>(html`
        <search-filter-editor .searchFilter=${initialFilter}></search-filter-editor>
      `);
      modalEl.appendChild(root);
      await root.updateComplete;
      syncInputValues(root);

      const createAlertSpy = vi.spyOn(alertController, 'create');

      root.searchFilter = { ...root.searchFilter, tags: ['alpha', 'beta'] };
      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');

      expect(canDismiss).toBe(true);
      expect(createAlertSpy).not.toHaveBeenCalled();
    });

    it('handles canDismiss safely when showName is false', async () => {
      const root = await fixture<SearchFilterEditor>(html`<search-filter-editor .showName=${false}></search-filter-editor>`);
      modalEl.appendChild(root);
      await root.updateComplete;
      syncInputValues(root);

      const canDismiss = await callCanDismiss(modalEl, undefined, 'cancel');
      expect(canDismiss).toBe(true);
    });
  });
});
