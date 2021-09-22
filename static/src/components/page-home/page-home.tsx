import { Component, Element, h, Prop } from '@stencil/core';
import { Recipe, UserSettings } from '../../models';
import { ajaxGetWithResult, ajaxPostWithLocation } from '../../helpers/ajax';
import { modalController } from '@ionic/core';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css'
})
export class PageHome {
  @Prop() userSettings: UserSettings | null;

  @Element() el: HTMLPageHomeElement;

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

  async saveNewRecipe(recipe: Recipe) {
    const router = document.querySelector('ion-router');

    try {
      const location = await ajaxPostWithLocation(this.el, '/api/v1/recipes', recipe);

      const temp = document.createElement('a');
      temp.href = location;
      const path = temp.pathname;

      let newRecipeId = NaN;
      const newRecipeIdMatch = path.match(/\/api\/v1\/recipes\/(\d+)/);
      if (newRecipeIdMatch) {
          newRecipeId = parseInt(newRecipeIdMatch[1], 10);
      } else {
          throw new Error(`Unexpected path: ${path}`);
      }

      router.push(`/recipes/${newRecipeId}/view`);
    } catch(ex) {
      console.log(ex);
    }
  }

  async onNewRecipeClicked() {
    const modal = await modalController.create({
      component: 'recipe-editor',
    });
    modal.present();

    const resp = await modal.onDidDismiss<{dismissed: boolean, recipe: Recipe}>();
    if (resp.data.dismissed === false) {
      this.saveNewRecipe(resp.data.recipe);
    }
  }

}
