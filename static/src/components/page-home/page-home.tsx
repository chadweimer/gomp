import { Component, Element, h, Prop } from '@stencil/core';
import { UserSettings } from '../../models';
import { ajaxGetWithResult } from '../../helpers/ajax';
import { modalController } from '@ionic/core';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css'
})
export class PageHome {
  @Prop() userSettings: UserSettings | null;

  @Element() el: HTMLElement;

  async connectedCallback() {
    try {
      this.userSettings = await ajaxGetWithResult(this.el, '/api/v1/users/current/settings');
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    return [
      <ion-content>
        <header class="ion-text-center">
          <h1>{this.userSettings?.homeTitle}</h1>
          <ion-img alt="Home Image" src={this.userSettings?.homeImageUrl} hidden={!this.userSettings?.homeImageUrl} />
        </header>
      </ion-content>,

      <ion-fab horizontal="end" vertical="bottom" slot="fixed">
        <ion-fab-button color="success" onClick={() => this.onNewRecipeClicked()}>
          <ion-icon icon="add" />
        </ion-fab-button>
      </ion-fab>
    ];
  }

  async onNewRecipeClicked() {
    const modal = await modalController.create({
      component: 'recipe-editor',
    });
    await modal.present();
  }

}
