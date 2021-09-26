import { loadingController, modalController } from '@ionic/core';
import { Component, Element, h, Prop, State } from '@stencil/core';
import { RecipesApi } from '../../../helpers/api';
import { DefaultSearchFilter, Recipe, RecipeCompact, SearchFilter } from '../../../models';

@Component({
  tag: 'page-search',
  styleUrl: 'page-search.css'
})
export class PageSearch {
  @Prop() filter: SearchFilter | null;

  @State() recipes: RecipeCompact[] = [];
  @State() totalRecipeCount = 0;
  @State() pageNum = 1;

  @Element() el: HTMLPageSearchElement;

  async connectedCallback() {
    await this.loadRecipes();
  }

  render() {
    return [
      <ion-content>
        <ion-grid class="no-pad">
          <ion-row>
            {this.recipes.map(recipe =>
              <ion-col size-xs="12" size-sm="12" size-md="6" size-lg="4" size-xl="3">
                <recipe-card recipe={recipe} />
              </ion-col>
            )}
          </ion-row>
        </ion-grid>
      </ion-content>,

      <ion-fab horizontal="end" vertical="bottom" slot="fixed">
        <ion-fab-button color="success" onClick={() => this.onNewRecipeClicked()}>
          <ion-icon icon="add" />
        </ion-fab-button>
      </ion-fab>
    ];
  }

  private async loadRecipes() {
    // Make sure to fill in any missing fields
    const defaultFilter = new DefaultSearchFilter();
    const filter = { ...defaultFilter, ...this.filter };

    this.recipes = [];
    this.totalRecipeCount = 0;
    try {
      const { total, recipes } = await RecipesApi.find(this.el, filter, this.pageNum, 24/*this.getRecipeCount()*/);
      this.recipes = recipes;
      this.totalRecipeCount = total;
    } catch (e) {
      console.error(e);
    }
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
