import { Component, Element, h, Prop } from '@stencil/core';
import { Recipe, UserSettings } from '../../../models';
import { loadingController, modalController } from '@ionic/core';
import { RecipesApi, UsersApi } from '../../../helpers/api';

@Component({
  tag: 'page-home',
  styleUrl: 'page-home.css'
})
export class PageHome {
  @Prop() userSettings: UserSettings | null;

  @Element() el: HTMLPageHomeElement;

  async connectedCallback() {
    try {
      this.userSettings = await UsersApi.getSettings(this.el);
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

  private async saveNewRecipe(recipe: Recipe, formData: FormData) {
    try {
      const newRecipeId = await RecipesApi.post(this.el, recipe);

      if (formData) {
        const loading = await loadingController.create({
          message: 'Uploading picture...'
        });
        loading.present();

        await RecipesApi.postImage(this.el, newRecipeId, formData);
        await loading.dismiss();
      }

      const router = document.querySelector('ion-router');
      router.push(`/recipes/${newRecipeId}/view`);
    } catch (ex) {
      console.log(ex);
    }
  }

  private async onNewRecipeClicked() {
    const modal = await modalController.create({
      component: 'recipe-editor',
    });
    modal.present();

    const resp = await modal.onDidDismiss<{ dismissed: boolean, recipe: Recipe, formData: FormData }>();
    if (resp.data.dismissed === false) {
      await this.saveNewRecipe(resp.data.recipe, resp.data.formData);
    }
  }

}
