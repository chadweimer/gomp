import { Component, h, Host, Prop } from '@stencil/core';
import { Recipe, RecipeImage } from '../../generated';
import { isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'recipe-print',
  styleUrl: 'recipe-print.css',
  shadow: true,
})
export class RecipePrint {
  @Prop() recipe: Recipe | null = null;
  @Prop() mainImage: RecipeImage | null = null;
  @Prop() rating = 0;

  render() {
    return (
      <Host>
        <div class="print-header">
          <h1>{this.recipe?.name}</h1>
          <five-star-rating value={this.rating} disabled={true} />
          <div class="meta">
            {!isNullOrEmpty(this.recipe?.servingSize) && <span>Servings: {this.recipe?.servingSize}</span>}
            &nbsp;
            {!isNullOrEmpty(this.recipe?.time) && <span>Time: {this.recipe?.time}</span>}
          </div>
        </div>
        {this.mainImage && (
          <div class="print-image">
            <img src={this.mainImage.thumbnailUrl} alt={this.mainImage.thumbnailUrl} />
          </div>
        )}
        <div class="print-section">
          {this.recipe?.ingredients && (
            <section>
              <h2>Ingredients</h2>
              <html-viewer value={this.recipe?.ingredients} />
            </section>
          )}
          {this.recipe?.directions && (
            <section>
              <h2>Directions</h2>
              <html-viewer value={this.recipe?.directions} />
            </section>
          )}
          {this.recipe?.storageInstructions && (
            <section>
              <h2>Storage Instructions</h2>
              <html-viewer value={this.recipe?.storageInstructions} />
            </section>
          )}
          {this.recipe?.sourceUrl && (
            <section>
              <h2>Source</h2>
              <div class="plain">{this.recipe?.sourceUrl}</div>
            </section>
          )}
        </div>
      </Host>
    );
  }
}
