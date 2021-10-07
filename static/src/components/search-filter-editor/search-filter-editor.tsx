import { Component, Element, Host, h, Prop } from '@stencil/core';
import { capitalizeFirstLetter, fromYesNoAny, toYesNoAny } from '../../helpers/utils';
import { DefaultSearchFilter, RecipeState, SearchField, SearchFilter, SortBy, SortDir, YesNoAny } from '../../models';
import state from '../../store';

@Component({
  tag: 'search-filter-editor',
  styleUrl: 'search-filter-editor.css',
})
export class SearchFilterEditor {
  @Prop() name = '';
  @Prop() showName = true;
  @Prop() searchFilter: SearchFilter = new DefaultSearchFilter();
  @Prop() prompt = 'New Search';

  @Element() el!: HTMLSearchFilterEditorElement;
  private form!: HTMLFormElement;

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{this.prompt}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
            {this.showName ?
              <ion-item>
                <ion-label position="stacked">Name</ion-label>
                <ion-input value={this.name} onIonChange={e => this.name = e.detail.value} required autofocus />
              </ion-item>
              : ''}
            <ion-item>
              <ion-label position="stacked">Search Terms</ion-label>
              <ion-input value={this.searchFilter.query} onIonChange={e => this.searchFilter = { ...this.searchFilter, query: e.detail.value }} />
            </ion-item>
            <tags-input value={this.searchFilter.tags} suggestions={state.currentUserSettings?.favoriteTags ?? []}
              onValueChanged={e => this.searchFilter = { ...this.searchFilter, tags: e.detail }} />
            <ion-item>
              <ion-label position="stacked">Sort By</ion-label>
              <ion-select value={this.searchFilter.sortBy} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, sortBy: e.detail.value }}>
                {Object.values(SortBy).map(item =>
                  <ion-select-option value={item}>{capitalizeFirstLetter(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Sort Order</ion-label>
              <ion-select value={this.searchFilter.sortDir} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, sortDir: e.detail.value }}>
                {Object.values(SortDir).map(item =>
                  <ion-select-option value={item}>{capitalizeFirstLetter(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Pictures</ion-label>
              <ion-select value={toYesNoAny(this.searchFilter.withPictures)} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, withPictures: fromYesNoAny(e.detail.value) }}>
                {Object.values(YesNoAny).map(item =>
                  <ion-select-option value={item}>{capitalizeFirstLetter(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">States</ion-label>
              <ion-select multiple value={this.searchFilter.states} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, states: e.detail.value }}>
                {Object.values(RecipeState).map(item =>
                  <ion-select-option value={item}>{capitalizeFirstLetter(item)}</ion-select-option>
                )}
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Fields to Search</ion-label>
              <ion-select multiple value={this.searchFilter.fields} interface="popover" onIonChange={e => this.searchFilter = { ...this.searchFilter, fields: e.detail.value }}>
                {Object.values(SearchField).map(item =>
                  <ion-select-option value={item}>{capitalizeFirstLetter(item)}</ion-select-option>
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

    this.el.closest('ion-modal').dismiss({
      dismissed: false,
      name: this.name,
      searchFilter: this.searchFilter
    });
  }

  private onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }

}
