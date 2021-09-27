import { loadingController, modalController } from '@ionic/core';
import { Component, Element, h, Method, State } from '@stencil/core';
import { RecipesApi } from '../../../helpers/api';
import { redirect } from '../../../helpers/utils';
import { DefaultSearchFilter, Recipe, RecipeCompact, SearchViewMode, SortDir } from '../../../models';
import state from '../../../store';

@Component({
  tag: 'page-search',
  styleUrl: 'page-search.css'
})
export class PageSearch {
  @State() recipes: RecipeCompact[] = [];
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
                <ion-button fill="solid" color="secondary"><ion-icon slot="start" icon="filter" /> Active</ion-button>
                <ion-button fill="solid" color="secondary"><ion-icon slot="start" icon="swap-vertical" /> Name</ion-button>
                {state.searchFilter?.sortDir === SortDir.Asc ?
                  <ion-button fill="solid" color="secondary" onClick={() => this.setSortDir(SortDir.Desc)}>
                    <ion-icon slot="icon-only" icon="arrow-up" />
                  </ion-button>
                  :
                  <ion-button fill="solid" color="secondary" onClick={() => this.setSortDir(SortDir.Asc)}>
                    <ion-icon slot="icon-only" icon="arrow-down" />
                  </ion-button>
                }
                {state.searchSettings?.viewMode === SearchViewMode.Card ?
                  <ion-button fill="solid" color="secondary" onClick={() => this.setViewMode(SearchViewMode.List)}>
                    <ion-icon slot="icon-only" icon="grid" />
                  </ion-button>
                  :
                  <ion-button fill="solid" color="secondary" onClick={() => this.setViewMode(SearchViewMode.Card)}>
                    <ion-icon slot="icon-only" icon="list" />
                  </ion-button>
                }
              </ion-buttons>
            </ion-col>
            <ion-col class="ion-hide-lg-down">
              <ion-buttons class="ion-justify-content-center">
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(1)}><ion-icon slot="icon-only" icon="arrow-back" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(state.searchPage - 1)}><ion-icon slot="icon-only" icon="chevron-back" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled>{state.searchPage} of {this.numPages}</ion-button>
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(state.searchPage + 1)}><ion-icon slot="icon-only" icon="chevron-forward" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(this.numPages)}><ion-icon slot="icon-only" icon="arrow-forward" /></ion-button>
              </ion-buttons>
            </ion-col>
            <ion-col class="ion-hide-lg-down" />
          </ion-row>
        </ion-grid>
        <ion-grid class="no-pad">
          <ion-row>
            {this.recipes.map(recipe =>
              <ion-col size-xs="12" size-sm="12" size-md="6" size-lg="4" size-xl="3">
                {state.searchSettings?.viewMode === SearchViewMode.Card ?
                  <recipe-card recipe={recipe} />
                  :
                  <ion-item>
                    <ion-avatar slot="start">
                      <ion-img src={recipe.thumbnailUrl} />
                    </ion-avatar>
                    <ion-label>{recipe.name}</ion-label>
                  </ion-item>
                }
              </ion-col>
            )}
          </ion-row>
        </ion-grid>
        <ion-grid>
          <ion-row>
            <ion-col>
              <ion-buttons class="ion-justify-content-center">
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(1)}><ion-icon slot="icon-only" icon="arrow-back" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === 1} onClick={() => this.loadRecipes(state.searchPage - 1)}><ion-icon slot="icon-only" icon="chevron-back" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled>{state.searchPage} of {this.numPages}</ion-button>
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(state.searchPage + 1)}><ion-icon slot="icon-only" icon="chevron-forward" /></ion-button>
                <ion-button fill="solid" color="secondary" disabled={state.searchPage === this.numPages} onClick={() => this.loadRecipes(this.numPages)}><ion-icon slot="icon-only" icon="arrow-forward" /></ion-button>
              </ion-buttons>
            </ion-col>
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

  private async loadRecipes(pageNum = null) {
    // Make sure to fill in any missing fields
    const defaultFilter = new DefaultSearchFilter();
    const filter = { ...defaultFilter, ...state.searchFilter };

    this.recipes = [];
    state.searchResultCount = null;
    if (pageNum) {
      state.searchPage = pageNum;
    }
    try {
      const { total, recipes } = await RecipesApi.find(this.el, filter, state.searchPage, this.getRecipeCount());
      this.recipes = recipes ?? [];
      state.searchResultCount = total;

      this.numPages = Math.ceil(total / this.getRecipeCount());
    } catch (e) {
      console.error(e);
    }
  }

  private async setSortDir(sortDir: SortDir) {
    state.searchFilter = {
      ...state.searchFilter,
      sortDir: sortDir
    };
    state.searchPage = 1;
    await this.loadRecipes();
  }

  private async setViewMode(viewMode: SearchViewMode) {
    state.searchSettings = {
      ...state.searchSettings,
      viewMode: viewMode
    };
    state.searchPage = 1;
    await this.loadRecipes();
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
