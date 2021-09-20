import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'page-login',
  styleUrl: 'page-login.css'
})
export class PageLogin {

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }

}
