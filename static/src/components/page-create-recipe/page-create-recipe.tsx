import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-create-recipe',
  styleUrl: 'page-create-recipe.css'
})
export class PageCreateRecipe {

  render() {
    return (
      <ion-content scroll-y>
        <recipe-editor></recipe-editor>
      </ion-content>
    );
  }

}
