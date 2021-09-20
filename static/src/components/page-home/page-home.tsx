import { Component, Element, h, Prop } from '@stencil/core';
import { UserSettings } from '../../global/models';
import { ajaxGetWithResult } from '../../helpers/ajax';

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
      <header class="ion-text-center">
        <h1>{this.userSettings?.homeTitle}</h1>
        <ion-img alt="Home Image" src={this.userSettings?.homeImageUrl} hidden={!this.userSettings?.homeImageUrl} />
      </header>,

      <ion-fab horizontal="end" vertical="bottom" slot="fixed">
        <ion-fab-button color="success" href="/recipes/new">
          <ion-icon icon="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    ];
  }

}
