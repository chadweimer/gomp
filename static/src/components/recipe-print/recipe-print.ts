import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Recipe } from '../../helpers/schema.gen';
import { getRecipeThumbnailUrl, isNullOrEmpty, toPresentationHtml } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import '../five-star-rating/five-star-rating';
import '../html-viewer/html-viewer';

@customElement('recipe-print')
export class RecipePrint extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        color: #222;
        padding: 24px;
        margin: 0 auto;
      }

      .print-header h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
      }

      .print-header .meta {
        color: #555;
        margin-bottom: 16px;
      }

      .print-image {
        margin: 16px 0;
      }

      .print-image img {
        max-height: 200px;
        max-width: 100%;
        height: auto;
        border-radius: 4px;
      }

      .print-section section {
        margin: 16px 0;
      }

      .print-section h2 {
        font-size: 18px;
        margin: 0 0 8px 0;
      }

      section {
        break-inside: avoid;
      }

      @media print {
        :host {
          padding: 0;
        }

        img {
          max-width: 100% !important;
          break-inside: avoid;
        }
      }
    `
  ];

  @property({ type: Object }) recipe: Recipe | null = null;

  render() {
    return html`
      <div class="print-header">
        <h1>${this.recipe?.name}</h1>
        <five-star-rating .value=${this.recipe?.rating ?? 0} ?disabled=${true}></five-star-rating>
        <div class="meta">
          ${!isNullOrEmpty(this.recipe?.servingSize) ? html`<span>Servings: ${this.recipe?.servingSize}</span>` : nothing}
          ${!isNullOrEmpty(this.recipe?.servingSize) && !isNullOrEmpty(this.recipe?.time) ? html`&nbsp;` : nothing}
          ${!isNullOrEmpty(this.recipe?.time) ? html`<span>Time: ${this.recipe?.time}</span>` : nothing}
        </div>
      </div>
      ${!isNullOrEmpty(this.recipe?.mainImageName)
        ? html`
            <div class="print-image">
              <img
                src=${getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName)}
                alt=${this.recipe?.mainImageName ?? ''}
              />
            </div>
          `
        : nothing}
      <div class="print-section">
        ${!isNullOrEmpty(this.recipe?.ingredients)
        ? html`
              <section>
                <h2>Ingredients</h2>
                <html-viewer .value=${toPresentationHtml(this, this.recipe?.ingredients, this.recipe?.id, false)}></html-viewer>
              </section>
            `
        : nothing}
        ${!isNullOrEmpty(this.recipe?.directions)
        ? html`
              <section>
                <h2>Directions</h2>
                <html-viewer .value=${toPresentationHtml(this, this.recipe?.directions, this.recipe?.id, false)}></html-viewer>
              </section>
            `
        : nothing}
        ${!isNullOrEmpty(this.recipe?.storageInstructions)
        ? html`
              <section>
                <h2>Storage Instructions</h2>
                <html-viewer .value=${toPresentationHtml(this, this.recipe?.storageInstructions, this.recipe?.id, false)}></html-viewer>
              </section>
            `
        : nothing}
        ${!isNullOrEmpty(this.recipe?.sourceUrl)
        ? html`
              <section>
                <h2>Source</h2>
                <div class="plain">${this.recipe?.sourceUrl}</div>
              </section>
            `
        : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-print': RecipePrint;
  }
}
