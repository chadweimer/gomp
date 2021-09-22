import { modalController } from '@ionic/core';
import { Component, h } from '@stencil/core';

@Component({
  tag: 'page-search',
  styleUrl: 'page-search.css'
})
export class PageSearch {

  render() {
    return (
      <ion-fab horizontal="end" vertical="bottom" slot="fixed">
        <ion-fab-button color="success" onClick={() => this.onNewRecipeClicked()}>
          <ion-icon icon="add" />
        </ion-fab-button>
      </ion-fab>
    );
  }

  private async onNewRecipeClicked() {
    const modal = await modalController.create({
      component: 'recipe-editor',
    });
    await modal.present();
  }

}
