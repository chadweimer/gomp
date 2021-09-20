import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-create-recipe',
  styleUrl: 'page-create-recipe.css'
})
export class PageCreateRecipe {

  render() {
    return (
      <recipe-editor></recipe-editor>
    );
  }

}
