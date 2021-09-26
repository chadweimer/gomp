import { loadingController, modalController } from '@ionic/core';
import { Component, Element, h, Method, State } from '@stencil/core';
import { RecipesApi } from '../../../helpers/api';
import { redirect } from '../../../helpers/utils';
import { DefaultSearchFilter, Recipe, RecipeCompact } from '../../../models';
import state from '../../../store';

@Component({
  tag: 'page-search',
  styleUrl: 'page-search.css'
})
export class PageSearch {
  @State() recipes: RecipeCompact[] = [];
  @State() totalRecipeCount = 0;
  @State() pageNum = 1;
  @State() numPages = 1;

  @Element() el: HTMLPageSearchElement;

  @Method()
  async activatedCallback() {
    await this.loadRecipes();
  }

  render() {
    return [
      <ion-content>
        <ion-grid>
          <ion-row>
            <ion-col>
              <ion-buttons class="justify-content-center-lg-down">
                <ion-button fill="solid" color="secondary"><ion-icon slot="icon-only" icon="filter" /> Active</ion-button>
                <ion-button fill="solid" color="secondary"><ion-icon slot="icon-only" icon="swap-vertical" /> Name</ion-button>
                <ion-button fill="solid" color="secondary"><ion-icon slot="icon-only" icon="arrow-up" /></ion-button>
                <ion-button fill="solid" color="secondary"><ion-icon slot="icon-only" icon="grid" /></ion-button>
              </ion-buttons>
            </ion-col>
            <ion-col class="ion-hide-lg-down">
              <ion-buttons class="ion-justify-content-center">
                <ion-button fill="solid" color="secondary" disabled={this.pageNum === 1} onClick={() => this.loadRecipes(1)}><ion-icon slot="icon-only" icon="arrow-back" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled={this.pageNum === 1} onClick={() => this.loadRecipes(this.pageNum - 1)}><ion-icon slot="icon-only" icon="chevron-back" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled>Page {this.pageNum} of {this.numPages}</ion-button>
                <ion-button fill="solid" color="secondary" disabled={this.pageNum === this.numPages} onClick={() => this.loadRecipes(this.pageNum + 1)}><ion-icon slot="icon-only" icon="chevron-forward" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled={this.pageNum === this.numPages} onClick={() => this.loadRecipes(this.numPages)}><ion-icon slot="icon-only" icon="arrow-forward" /></ion-button>
              </ion-buttons>
            </ion-col>
            <ion-col class="ion-hide-lg-down" />
          </ion-row>
        </ion-grid>
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

  private async loadRecipes(pageNum = 1) {
    // Make sure to fill in any missing fields
    const defaultFilter = new DefaultSearchFilter();
    const filter = { ...defaultFilter, ...state.search };

    this.recipes = [];
    this.totalRecipeCount = 0;
    this.pageNum = pageNum;
    try {
      const { total, recipes } = await RecipesApi.find(this.el, filter, this.pageNum, this.getRecipeCount());
      this.recipes = recipes ?? [];
      this.totalRecipeCount = total;

      this.numPages = Math.ceil(total / this.getRecipeCount());
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

      await redirect(`/recipes/${newRecipeId}/view`);
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

  private getRecipeCount() {
    // TODO: View modes
    return 2;
  }

}
