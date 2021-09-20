import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css'
})
export class PageHome {

  render() {
    return (
      <ion-fab horizontal="end" vertical="bottom" slot="fixed">
        <ion-fab-button color="success" href="/recipes/new">
          <ion-icon icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    );
  }

}
