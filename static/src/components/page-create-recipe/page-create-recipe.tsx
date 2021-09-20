import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-create-recipe',
  styleUrl: 'page-create-recipe.css'
})
export class PageCreateRecipe {

  render() {
    return (
      <div class="scroll-root">
        <recipe-editor></recipe-editor>
      </div>
    );
  }

}
