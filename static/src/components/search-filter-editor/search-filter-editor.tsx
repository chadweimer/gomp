import { Component, Host, h, Prop } from '@stencil/core';
import { DefaultSearchFilter, SearchFilter } from '../../models';

@Component({
  tag: 'search-filter-editor',
  styleUrl: 'search-filter-editor.css',
})
export class SearchFilterEditor {
  @Prop() filter: SearchFilter = new DefaultSearchFilter();

  render() {
    return (
      <Host>
        <slot></slot>
        <ion-item>
          <ion-label position="stacked">Query</ion-label>
          <ion-input value={this.filter.query} />
        </ion-item>
      </Host>
    );
  }

}
