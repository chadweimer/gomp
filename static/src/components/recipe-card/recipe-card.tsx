import { Component, h, Prop } from '@stencil/core';
import { RecipeCompact } from '../../models';

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
      <ion-card href={this.recipe.id ? `/recipes/${this.recipe.id}` : ''}>
        {this.recipe.thumbnailUrl
          ? <ion-img class={{ ['image']: true, [this.size]: true }} src={this.recipe.thumbnailUrl} />
          : <div class={{ ['image']: true, [this.size]: true }} />}
        <ion-card-content>
          <p class="single-line">{this.recipe.name}</p>
          <five-star-rating value={this.recipe?.averageRating} disabled />
        </ion-card-content>
      </ion-card>
    );
  }

}
