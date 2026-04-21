import { Component, h, Host, Listen, Prop, State } from '@stencil/core';
import { Recipe, RecipeImage } from '../../generated';
import { isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'recipe-print',
  styleUrl: 'recipe-print.css',
  shadow: false,
})
export class RecipePrint {
  @Prop() recipe: Recipe | null = null;
  @Prop() mainImage: RecipeImage | null = null;
  @Prop() rating = 0;

  @State() hasPrinted: boolean = false;

  @Listen('load', { target: 'window' })
  onLoaded() {
    if (this.hasPrinted) return;
    this.hasPrinted = true;
    // small delay to ensure layout stabilizes
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error(e);
      }
    }, 500);
  }

  componentDidLoad() {
    // If there's no main image, still auto-print after short delay
    if (!this.mainImage && !this.hasPrinted) {
      this.hasPrinted = true;
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error(e);
        }
      }, 500);
    }
  }

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
            <img src={this.mainImage.url} alt={this.mainImage.thumbnailUrl} />
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
          {this.recipe?.nutritionInfo && (
            <section>
              <h2>Nutrition</h2>
              <html-viewer value={this.recipe?.nutritionInfo} />
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
