import { Component, Host, h, Prop } from '@stencil/core';
import { RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import { getRecipeThumbnailUrl, isNull, isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
  shadow: true,
})
export class RecipeCard {
  @Prop() recipe: RecipeCompact = {
    name: '',
    state: RecipeState.Active,
    mainImageName: '',
    rating: 0,
  };

  render() {
    return (
      <Host>
        <ion-card href={isNull(this.recipe?.id) ? '' : `/recipes/${this.recipe?.id}`}>
          <img loading="lazy" class={{ image: true, hidden: isNullOrEmpty(this.recipe?.mainImageName) }} alt="" src={getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName)} />
          <ion-card-header class="header">
            <ion-card-title class="single-line title" title={this.recipe?.name}>
              {this.recipe?.name}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content class="no-overflow content">
            <five-star-rating value={this.recipe?.rating ?? 0} disabled />
          </ion-card-content>
          {this.recipe?.state === RecipeState.Archived &&
            <ion-badge class="top-right-padded translucent" color="dark">Archived</ion-badge>}
        </ion-card>
      </Host>
    );
  }
}
