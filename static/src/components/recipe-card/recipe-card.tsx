import { Component, Host, h, Prop } from '@stencil/core';
import { RecipeCompact, RecipeState } from '../../models';

@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
})
export class RecipeCard {
  @Prop() recipe: RecipeCompact = {
    name: '',
    thumbnailUrl: ''
  };
  @Prop() size: 'large' | 'small' = 'large';

  render() {
    return (
      <Host>
        <ion-card href={this.recipe.id ? `/recipes/${this.recipe.id}` : ''}>
          {this.recipe.thumbnailUrl
            ? <ion-img class={{ ['image']: true, [this.size]: true }} src={this.recipe.thumbnailUrl} />
            : <div class={{ ['image']: true, [this.size]: true }} />}
          <ion-card-content>
            <div class="no-overflow">
              <p class="single-line">{this.recipe.name}</p>
              <five-star-rating value={this.recipe?.averageRating} disabled />
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
