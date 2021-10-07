import { Component, Element, Host, h, Prop } from '@stencil/core';
import { DefaultSearchFilter, SearchFilter } from '../../models';

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
                <ion-input value={this.name} onIonChange={e => this.name = e.detail.value} />
              </ion-item>
              : ''}
            <ion-item>
              <ion-label position="stacked">Search Terms</ion-label>
              <ion-input value={this.searchFilter.query} onIonChange={e => this.searchFilter = { ...this.searchFilter, query: e.detail.value }} />
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
      searchDilter: this.searchFilter
    });
  }

  private onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }

}
