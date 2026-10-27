import { LitElement, html, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import {
  RecipeState,
  SavedSearchFilterCompact,
  SearchField,
  SearchFilter,
  SortBy,
  SortDir,
  UserSettings,
  YesNoAny,
} from '../../helpers/schema.gen';
import { api } from '../../helpers/api';
import { configureModalCanDismiss, configureModalSelectsWorkaround, getContainingModal } from '../../helpers/modals';
import { fromYesNoAny, toYesNoAny, insertSpacesBetweenWords, isNull } from '../../helpers/utils';
import { getDefaultSearchFilter } from '../../models';
import { globalStyles } from '../../global/shared-styles';
import '../tags-input/tags-input';

@customElement('search-filter-editor')
export class SearchFilterEditor extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }
    `
  ];

  @property({ type: String }) name = '';
  @property({ type: String }) saveLabel = 'Save';
  @property({ type: Boolean }) showName = true;
  @property({ type: Boolean }) showSavedLoader = false;
  @property({ type: Object }) searchFilter: SearchFilter = getDefaultSearchFilter();
  @property({ type: String }) prompt = 'New Search';

  @state() private currentUserSettings: UserSettings | null = null;
  @state() private selectedFilterId: number | null = null;
  @state() private filters: SavedSearchFilterCompact[] = [];

  @query('form') private readonly form!: HTMLFormElement;
  @query('ion-input[label="Name"]') private readonly nameInput?: HTMLIonInputElement;
  @query('ion-input[label="Search Terms"]') private readonly queryInput?: HTMLIonInputElement;

  private parentModal?: HTMLIonModalElement | null;

  override connectedCallback() {
    super.connectedCallback();
    const initialName = this.name;
    const initialFilter = { ...this.searchFilter };

    this.parentModal = getContainingModal(this);
    configureModalCanDismiss(this.parentModal, (_data?: unknown, role?: string) => {
      if (role === 'save') {
        return false;
      }

      if (this.nameInput) {
        this.name = (this.nameInput.value ?? '') as string;
      }
      if (this.queryInput) {
        this.searchFilter = {
          ...this.searchFilter,
          query: (this.queryInput.value ?? '') as string,
        };
      }

      return !this.areEqual(initialFilter, this.searchFilter) || this.name !== initialName;
    });

    api.loadUserSettings().then(res => this.currentUserSettings = res, console.error);
    if (this.showSavedLoader) {
      api.loadSearchFilters().then(res => this.filters = res, console.error);
    }
  }

  firstUpdated() {
    configureModalSelectsWorkaround(this);
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-title>${this.prompt}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" @click=${() => this.onResetClicked()}>Reset</ion-button>
            <ion-button color="danger" @click=${() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
          <ion-buttons slot="primary">
            <ion-button @click=${() => this.onSaveClicked()}>${this.saveLabel}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <form @submit=${(e: Event) => e.preventDefault()}>
          ${this.showSavedLoader
        ? html`
                <ion-item id="savedSearchLoader" lines="full">
                  <ion-select
                    label="Load From Saved"
                    label-placement="floating"
                    interface="popover"
                    .value=${this.selectedFilterId}
                    @ionChange=${(e: CustomEvent<{ value: number }>) => (this.selectedFilterId = e.detail.value)}
                  >
                    ${this.filters?.map(
          (item) => html`<ion-select-option .value=${item.id}>${item.name}</ion-select-option>`
        )}
                    <ion-button
                      slot="end"
                      fill="clear"
                      ?disabled=${isNull(this.selectedFilterId)}
                      @click=${() => this.onLoadSearchClicked()}
                    >
                      <ion-icon slot="start" name="open-outline"></ion-icon>
                      Load
                    </ion-button>
                  </ion-select>
                </ion-item>
              `
        : ''}
          ${this.showName
        ? html`
                <ion-item lines="full">
                  <ion-input
                    label="Name"
                    label-placement="stacked"
                    .value=${this.name}
                    required
                    autofocus
                    @ionChange=${(e: CustomEvent) => (this.name = (e.detail.value ?? '') as string)}
                  ></ion-input>
                </ion-item>
              `
        : ''}
          <ion-item lines="full">
            <ion-input
              label="Search Terms"
              label-placement="stacked"
              .value=${this.searchFilter?.query}
              @ionChange=${(e: CustomEvent) =>
        (this.searchFilter = { ...this.searchFilter, query: (e.detail.value ?? '') as string })}
            ></ion-input>
          </ion-item>
          <ion-item lines="full">
            <tags-input
              label="Tags"
              label-placement="stacked"
              .value=${this.searchFilter?.tags ?? []}
              .suggestions=${this.currentUserSettings?.favoriteTags ?? []}
              @valueChanged=${(e: CustomEvent<string[]>) =>
        (this.searchFilter = { ...this.searchFilter, tags: e.detail })}
            >
              <ion-input enterkeyhint="enter"></ion-input>
            </tags-input>
          </ion-item>
          <ion-item lines="full">
            <ion-select
              label="Sort By"
              label-placement="stacked"
              interface="popover"
              .value=${this.searchFilter?.sortBy}
              @ionChange=${(e: CustomEvent<{ value: SortBy }>) =>
        (this.searchFilter = { ...this.searchFilter, sortBy: e.detail.value })}
            >
              ${Object.keys(SortBy).map(
          (item) => html`
                  <ion-select-option .value=${SortBy[item as keyof typeof SortBy]}>
                    ${insertSpacesBetweenWords(item)}
                  </ion-select-option>
                `
        )}
            </ion-select>
          </ion-item>
          <ion-item lines="full">
            <ion-select
              label="Sort Order"
              label-placement="stacked"
              interface="popover"
              .value=${this.searchFilter?.sortDir}
              @ionChange=${(e: CustomEvent<{ value: SortDir }>) =>
        (this.searchFilter = { ...this.searchFilter, sortDir: e.detail.value })}
            >
              ${Object.keys(SortDir).map(
          (item) => html`
                  <ion-select-option .value=${SortDir[item as keyof typeof SortDir]}>
                    ${insertSpacesBetweenWords(item)}
                  </ion-select-option>
                `
        )}
            </ion-select>
          </ion-item>
          <ion-item lines="full">
            <ion-select
              label="Pictures"
              label-placement="stacked"
              interface="popover"
              .value=${toYesNoAny(this.searchFilter?.withPictures)}
              @ionChange=${(e: CustomEvent<{ value: YesNoAny }>) =>
        (this.searchFilter = { ...this.searchFilter, withPictures: fromYesNoAny(e.detail.value) })}
            >
              ${Object.keys(YesNoAny).map(
          (item) => html`
                  <ion-select-option .value=${YesNoAny[item as keyof typeof YesNoAny]}>
                    ${insertSpacesBetweenWords(item)}
                  </ion-select-option>
                `
        )}
            </ion-select>
          </ion-item>
          <ion-item lines="full">
            <ion-select
              label="States"
              label-placement="stacked"
              interface="popover"
              multiple
              .value=${this.searchFilter?.states}
              @ionChange=${(e: CustomEvent<{ value: RecipeState[] }>) =>
        (this.searchFilter = { ...this.searchFilter, states: e.detail.value })}
            >
              ${Object.keys(RecipeState).map(
          (item) => html`
                  <ion-select-option .value=${RecipeState[item as keyof typeof RecipeState]}>
                    ${insertSpacesBetweenWords(item)}
                  </ion-select-option>
                `
        )}
            </ion-select>
          </ion-item>
          <ion-item lines="full">
            <ion-select
              label="Fields to Search"
              label-placement="stacked"
              interface="popover"
              multiple
              .value=${this.searchFilter?.fields}
              @ionChange=${(e: CustomEvent<{ value: SearchField[] }>) =>
        (this.searchFilter = { ...this.searchFilter, fields: e.detail.value })}
            >
              ${Object.keys(SearchField).map(
          (item) => html`
                  <ion-select-option .value=${SearchField[item as keyof typeof SearchField]}>
                    ${insertSpacesBetweenWords(item)}
                  </ion-select-option>
                `
        )}
            </ion-select>
          </ion-item>
        </form>
      </ion-content>
    `;
  }

  private async onSaveClicked() {
    if (!this.form?.reportValidity()) {
      return;
    }

    await this.parentModal?.dismiss(
      {
        name: this.name,
        searchFilter: this.searchFilter,
      },
      'save'
    );
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }

  private onResetClicked() {
    this.searchFilter = getDefaultSearchFilter();
  }

  private async onLoadSearchClicked() {
    if (isNull(this.selectedFilterId)) {
      return;
    }

    try {
      const { data: filter, error } = await api.client.GET('/users/current/filters/{filterId}', {
        params: { path: { filterId: this.selectedFilterId } },
      });

      if (error) {
        throw new Error('Failed to load search filter.', { cause: error });
      }

      if (filter) {
        this.searchFilter = filter;
        this.selectedFilterId = null;
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  private areEqual(a: SearchFilter, b: SearchFilter) {
    const aTags = [...(a.tags ?? [])].sort((x, y) => x.localeCompare(y));
    const bTags = [...(b.tags ?? [])].sort((x, y) => x.localeCompare(y));
    return (
      a.query === b.query &&
      a.withPictures === b.withPictures &&
      a.sortBy === b.sortBy &&
      a.sortDir === b.sortDir &&
      JSON.stringify(a.fields) === JSON.stringify(b.fields) &&
      JSON.stringify(a.states) === JSON.stringify(b.states) &&
      JSON.stringify(aTags) === JSON.stringify(bTags)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'search-filter-editor': SearchFilterEditor;
  }
}
