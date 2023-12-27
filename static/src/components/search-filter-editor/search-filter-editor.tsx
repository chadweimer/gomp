import { Component, Element, Host, h, Prop, State } from '@stencil/core';
import { RecipeState, SavedSearchFilterCompact, SearchField, SearchFilter, SortBy, SortDir, UserSettings, YesNoAny } from '../../generated';
import { loadSearchFilters, loadUserSettings, usersApi } from '../../helpers/api';
import { configureModalAutofocus, dismissContainingModal, fromYesNoAny, toYesNoAny, insertSpacesBetweenWords } from '../../helpers/utils';
import { getDefaultSearchFilter } from '../../models';

@Component({
  tag: 'search-filter-editor',
  styleUrl: 'search-filter-editor.css',
})
export class SearchFilterEditor {
  @Prop() name = '';
  @Prop() saveLabel = 'Save';
  @Prop() showName = true;
  @Prop() showSavedLoader = false;
  @Prop() searchFilter: SearchFilter = getDefaultSearchFilter();
  @Prop() prompt = 'New Search';

  @State() currentUserSettings: UserSettings | null;
  @State() selectedFilterId: number | null = null;
  @State() filters: SavedSearchFilterCompact[] = [];

  @Element() el!: HTMLSearchFilterEditorElement;
  private form!: HTMLFormElement;

  async connectedCallback() {
    configureModalAutofocus(this.el);
    this.currentUserSettings = await loadUserSettings();
    if (this.showSavedLoader) {
      this.filters = await loadSearchFilters();
    }
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-title>{this.prompt}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onResetClicked()}>Reset</ion-button>
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
            <ion-buttons slot="primary">
              <ion-button onClick={() => this.onSaveClicked()}>{this.saveLabel}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            {this.showSavedLoader ?
              <ion-item lines="full">
                <ion-select label="Load From Saved" value={this.selectedFilterId} interface="popover" onIonChange={e => this.selectedFilterId = e.detail.value}>
                  {this.filters?.map(item =>
                    <ion-select-option key={item.id} value={item.id}>{item.name}</ion-select-option>
                  )}
                </ion-select>
                <ion-button slot="end" fill="clear" disabled={this.selectedFilterId === null} onClick={() => this.onLoadSearchClicked()}>
                  <ion-icon slot="icon-only" name="open-outline" />
                </ion-button>
              </ion-item>
              : ''}
            {this.showName ?
              <ion-item lines="full">
                <ion-input label="Name" label-placement="stacked" value={this.name}
                  autocorrect="on"
                  spellcheck="true"
                  onIonBlur={e => this.name = e.target.value as string}
                  required
                  autofocus />
              </ion-item>
              : ''}
            <ion-item lines="full">
              <ion-input label="Search Terms" label-placement="stacked" value={this.searchFilter.query}
                autocorrect="on"
                spellcheck="true"
                onIonBlur={e => this.searchFilter = { ...this.searchFilter, query: e.target.value as string }} />
            </ion-item>
            <tags-input value={this.searchFilter.tags} suggestions={this.currentUserSettings?.favoriteTags ?? []}
              onValueChanged={e => this.searchFilter = { ...this.searchFilter, tags: e.detail }} />
            <ion-item lines="full">
              <ion-select label="Sort By" label-placement="stacked" value={this.searchFilter.sortBy} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, sortBy: e.detail.value }}>
                {Object.keys(SortBy).map(item =>
                  <ion-select-option key={item} value={SortBy[item]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item lines="full">
              <ion-select label="Sort Order" label-placement="stacked" value={this.searchFilter.sortDir} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, sortDir: e.detail.value }}>
                {Object.keys(SortDir).map(item =>
                  <ion-select-option key={item} value={SortDir[item]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item lines="full">
              <ion-select label="Pictures" label-placement="stacked" value={toYesNoAny(this.searchFilter.withPictures)} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, withPictures: fromYesNoAny(e.detail.value) }}>
                {Object.keys(YesNoAny).map(item =>
                  <ion-select-option key={item} value={YesNoAny[item]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item lines="full">
              <ion-select label="States" label-placement="stacked" multiple value={this.searchFilter.states} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, states: e.detail.value }}>
                {Object.keys(RecipeState).map(item =>
                  <ion-select-option key={item} value={RecipeState[item]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item lines="full">
              <ion-select label="Fields to Search" label-placement="stacked" multiple value={this.searchFilter.fields} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, fields: e.detail.value }}>
                {Object.keys(SearchField).map(item =>
                  <ion-select-option key={item} value={SearchField[item]}>{insertSpacesBetweenWords(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
          </form>
        </ion-content>
      </Host>
    );
  }

  private async onSaveClicked() {
    if (!this.form.reportValidity()) {
      return;
    }

    dismissContainingModal(this.el, {
      name: this.name,
      searchFilter: this.searchFilter
    });
  }

  private onCancelClicked() {
    dismissContainingModal(this.el);
  }

  private onResetClicked() {
    this.searchFilter = getDefaultSearchFilter();
  }

  private async onLoadSearchClicked() {
    if (this.selectedFilterId === null) {
      return;
    }

    try {
      ({ data: this.searchFilter } = await usersApi.getSearchFilter(this.selectedFilterId));
      this.selectedFilterId = null;
    } catch (ex) {
      console.error(ex);
    }
  }

}
