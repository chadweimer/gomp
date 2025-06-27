import { Component, Host, h, Prop } from '@stencil/core';
import { RecipeCompact, RecipeState } from '../../generated';
import { isNull, isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
  shadow: true,
})
export class RecipeCard {
  @Prop() recipe: RecipeCompact = {
    name: '',
    thumbnailUrl: '',
    averageRating: 0,
  };
  @Prop() size: 'large' | 'small' = 'large';

  render() {
    return (
      <Host>
        <ion-card href={!isNull(this.recipe.id) ? `/recipes/${this.recipe.id}` : ''} class={{ zoom: true, [this.size]: true }}>
          <ion-img class={{ image: true, hidden: isNullOrEmpty(this.recipe.thumbnailUrl) }} alt="" src={this.recipe.thumbnailUrl} />
          <ion-card-header class="header">
            <ion-card-title class="single-line title">
              {this.recipe.name}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content class="no-overflow content">
            <five-star-rating value={this.recipe.averageRating} disabled />
          </ion-card-content>
          {this.recipe?.state === RecipeState.Archived &&
            <ion-badge class="top-right-padded opacity-75" color="medium">Archived</ion-badge>}
        </ion-card>
      </Host>
    );
  }
}
