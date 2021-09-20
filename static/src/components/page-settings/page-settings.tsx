import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'page-settings',
  styleUrl: 'page-settings.css'
})
export class PageSettings {

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }

}
