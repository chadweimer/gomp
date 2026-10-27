import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../vitest.setup';
import { RecipeState, SavedSearchFilter, SavedSearchFilterCompact, SearchField, SearchFilter, SortBy, SortDir, UserSettings } from '../../helpers/schema.gen';
import { getDefaultSearchFilter } from '../../models';
import { clearState } from '../../stores/state';
import './search-filter-editor';
import { SearchFilterEditor } from './search-filter-editor';

describe('search-filter-editor', () => {
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

  beforeEach(() => {
    fetchMocker.resetMocks();
    clearState();

    modalEl = document.createElement('ion-modal');
    modalEl.dismiss = vi.fn().mockResolvedValue(true);
    document.body.appendChild(modalEl);

    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/users\/current\/settings$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockSettings));
      }
      if (req.url.match(/\/users\/current\/filters\/\d+$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockLoadedFilter));
      }
      if (req.url.match(/\/users\/current\/filters(\?.*)?$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify({ total: mockFilters.length, filters: mockFilters }));
      }
      return Promise.resolve(JSON.stringify({}));
    });
  });

  afterEach(() => {
    fetchMocker.resetMocks();
    clearState();
    modalEl.remove();
    vi.restoreAllMocks();
  });

  it('renders default values', async () => {
    const el = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);

    const title = el.shadowRoot?.querySelector('ion-title');
    expect(title?.textContent?.trim()).toBe('New Search');

    const nameInput = el.shadowRoot?.querySelector('ion-input[label="Name"]');
    expect(nameInput).not.toBeNull();

    const tagsInput = el.shadowRoot?.querySelector('tags-input');
    expect(tagsInput).not.toBeNull();
  });

  it('resets searchFilter when reset button clicked', async () => {
    const filter: SearchFilter = {
      ...getDefaultSearchFilter(),
      query: 'something',
      sortBy: SortBy.Created,
    };
    const el = await fixture<SearchFilterEditor>(html`<search-filter-editor .searchFilter=${filter}></search-filter-editor>`);

    const resetBtn = el.shadowRoot?.querySelector('ion-buttons[slot="secondary"] ion-button') as HTMLElement;
    resetBtn.click();
    await el.updateComplete;

    expect(el.searchFilter).toEqual(getDefaultSearchFilter());
  });

  it('dismisses with form data on save', async () => {
    const el = await fixture<SearchFilterEditor>(html`<search-filter-editor name="My Search"></search-filter-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const saveBtn = el.shadowRoot?.querySelector('ion-buttons[slot="primary"] ion-button') as HTMLElement;
    saveBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Search' }),
      'save'
    );
  });

  it('dismisses modal on cancel', async () => {
    const el = await fixture<SearchFilterEditor>(html`<search-filter-editor></search-filter-editor>`);
    modalEl.appendChild(el);
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll<HTMLIonButtonElement>('ion-buttons[slot="secondary"] ion-button')!;
    const cancelBtn = buttons[1];
    cancelBtn.click();

    expect(modalEl.dismiss).toHaveBeenCalledWith(undefined, 'cancel');
  });

  it('renders saved loader when showSavedLoader is true and loads filter', async () => {
    const el = await fixture<SearchFilterEditor>(html`<search-filter-editor ?showSavedLoader=${true}></search-filter-editor>`);
    await el.updateComplete;

    const loaderItem = el.shadowRoot?.querySelector('#savedSearchLoader');
    expect(loaderItem).not.toBeNull();

    (el as any).selectedFilterId = 1;
    await (el as any).onLoadSearchClicked();
    await el.updateComplete;

    expect(el.searchFilter.query).toBe('chicken');
  });
});

