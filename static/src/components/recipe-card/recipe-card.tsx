import { Component, Host, h } from '@stencil/core';

@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
  shadow: true,
})
export class RecipeCard {

  render() {
    return (
      <Host>
        <slot></slot>
      </Host>
    );
  }

}
