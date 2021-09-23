import { modalController } from '@ionic/core';
import { Component, Element, h, Prop, State } from '@stencil/core';
import { ajaxGetWithResult } from '../../helpers/ajax';
import { DefaultSearchFilter, RecipeCompact, SearchFilter } from '../../models';

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
      const filterQuery = {
        'q': filter.query,
        'pictures': filter.withPictures,
        'fields[]': filter.fields,
        'tags[]': filter.tags,
        'states[]': filter.states,
        'sort': filter.sortBy,
        'dir': filter.sortDir,
        'page': this.pageNum,
        'count': 24//this.getRecipeCount(),
      };
      const response: { total: number, recipes: RecipeCompact[] } = await ajaxGetWithResult(this.el, '/api/v1/recipes', filterQuery);
      this.recipes = response.recipes;
      this.totalRecipeCount = response.total;
    } catch (e) {
      console.error(e);
    }
  }

  private async onNewRecipeClicked() {
    const modal = await modalController.create({
      component: 'recipe-editor',
    });
    await modal.present();
  }

}
