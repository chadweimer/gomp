import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'page-admin',
  styleUrl: 'page-admin.css'
})
export class PageAdmin {

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }

}
