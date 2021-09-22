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
      <ion-card>
        {this.recipe?.thumbnailUrl ? <ion-img src={this.recipe?.thumbnailUrl}/> : ''}
        <ion-card-header>
          <ion-card-title>{this.recipe?.name}</ion-card-title>
        </ion-card-header>
      </ion-card>
    );
  }

}
