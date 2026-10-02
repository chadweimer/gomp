import { Component, Element, h, Host, Prop } from '@stencil/core';
import { Recipe } from '../../helpers/schema.gen';
import { getRecipeThumbnailUrl, isNullOrEmpty, toPresentationHtml } from '../../helpers/utils';

@Component({
  tag: 'recipe-print',
  styleUrl: 'recipe-print.css',
  shadow: true,
})
export class RecipePrint {
  @Prop() recipe: Recipe | null = null;

  @Element() el!: HTMLRecipePrintElement;

  render() {
    return (
      <Host>
        <div class="print-header">
          <h1>{this.recipe?.name}</h1>
          <five-star-rating value={this.recipe?.rating} disabled={true} />
          <div class="meta">
            {!isNullOrEmpty(this.recipe?.servingSize) && <span>Servings: {this.recipe?.servingSize}</span>}
            &nbsp;
            {!isNullOrEmpty(this.recipe?.time) && <span>Time: {this.recipe?.time}</span>}
          </div>
        </div>
        {!isNullOrEmpty(this.recipe?.mainImageName) && (
          <div class="print-image">
            <img src={getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName)} alt={this.recipe?.mainImageName} />
          </div>
        )}
        <div class="print-section">
          {this.recipe?.ingredients && (
            <section>
              <h2>Ingredients</h2>
              <html-viewer value={toPresentationHtml(this.el, this.recipe?.ingredients, this.recipe?.id, false)} />
            </section>
          )}
          {this.recipe?.directions && (
            <section>
              <h2>Directions</h2>
              <html-viewer value={toPresentationHtml(this.el, this.recipe?.directions, this.recipe?.id, false)} />
            </section>
          )}
          {this.recipe?.storageInstructions && (
            <section>
              <h2>Storage Instructions</h2>
              <html-viewer value={toPresentationHtml(this.el, this.recipe?.storageInstructions, this.recipe?.id, false)} />
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
