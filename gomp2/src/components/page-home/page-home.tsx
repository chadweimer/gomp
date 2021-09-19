import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css',
  shadow: true,
})
export class PageHome {

  render() {
    return (
      <span>Home</span>
    );
  }

}
