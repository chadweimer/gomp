import { Component, h, Prop } from '@stencil/core';
import { RecipeCompact } from '../../models';

@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
  shadow: true,
})
export class RecipeCard {
  @Prop() recipe: RecipeCompact | null;

  render() {
    return (
      <ion-card href={this.recipe ? `/recipes/${this.recipe?.id}/view` : ''}>
        {this.recipe?.thumbnailUrl ? <ion-img src={this.recipe?.thumbnailUrl} /> : <div class="image-placeholder" />}
        <ion-card-header>
          <ion-card-subtitle>{this.recipe?.name}</ion-card-subtitle>
        </ion-card-header>
      </ion-card>
    );
  }

}