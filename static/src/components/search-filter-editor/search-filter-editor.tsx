import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'search-filter-editor',
  styleUrl: 'search-filter-editor.css',
  shadow: true,
})
export class SearchFilterEditor {

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }

}
