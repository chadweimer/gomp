import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-recipes',
  styleUrl: 'page-recipes.css'
})
export class PageRecipes {

  render() {
    return (
      <ion-tabs>
        <ion-tab tab="tab-search" component="page-search">
          <ion-nav />
        </ion-tab>

        <ion-tab tab="tab-create-recipe" component="page-create-recipe">
          <ion-nav />
        </ion-tab>

        <ion-tab tab="tab-view-recipe" component="page-view-recipe">
          <ion-nav />
        </ion-tab>

        <ion-tab tab="tab-edit-recipe" component="page-edit-recipe">
          <ion-nav />
        </ion-tab>
      </ion-tabs>
    );
  }

}
