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
        <ion-card href={!isNull(this.recipe.id) ? `/recipes/${this.recipe.id}` : ''} class={{ [this.size]: true }}>
          {!isNullOrEmpty(this.recipe.thumbnailUrl)
            ? <img class="image" alt="" src={this.recipe.thumbnailUrl} />
            : <div class="image" />}
          <ion-card-content>
            <div class="no-overflow">
              <div class="single-line">{this.recipe.name}</div>
              <five-star-rating value={this.recipe.averageRating} disabled />
            </div>
          </ion-card-content>
          {this.recipe?.state === RecipeState.Archived
            ? <ion-badge class="top-right-padded opacity-75" color="medium">Archived</ion-badge>
            : ''}
        </ion-card>
      </Host>
    );
  }
}
