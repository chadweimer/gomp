import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Recipe, RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import { emit, formatDate, getRecipeImageUrl, getRecipeThumbnailUrl, isNullOrEmpty, toPresentationHtml } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import '../five-star-rating/five-star-rating';
import '../html-viewer/html-viewer';

@customElement('recipe-viewer')
export class RecipeViewer extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
        contain: content;
      }

      ion-list-header.section {
        color: var(--ion-text-color-step-300, #4d4d4d);
      }

      img.main {
        object-fit: cover;
        width: 100%;
        max-height: 20vh;
      }

      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ion-padding, 8px);
      }

      .tags * {
        cursor: pointer;
      }

      @media only screen and (min-width: 768px) {
        img.main {
          max-height: 25vh;
        }
      }

      @media only screen and (min-width: 992px) {
        img.main {
          max-height: 30vh;
        }
      }

      @media only screen and (min-width: 1200px) {
        img.main {
          max-height: 35vh;
        }
      }
    `
  ];

  @property({ type: Object }) recipe: Recipe | null = null;
  @property({ type: Array }) links: RecipeCompact[] = [];
  @property({ type: Boolean }) readonly = false;

  render() {
    return html`
      <ion-card>
        ${!isNullOrEmpty(this.recipe?.mainImageName)
        ? html`
              <a
                href=${ifDefined(getRecipeImageUrl(this.recipe?.id, this.recipe?.mainImageName))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  class="main zoom"
                  alt=${ifDefined(this.recipe?.name)}
                  src=${ifDefined(getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName))}
                  @load=${(e: Event) => {
            const img = e.currentTarget as HTMLImageElement;
            if (
              !isNullOrEmpty(this.recipe?.mainImageName) &&
              img.src.endsWith(getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName))
            ) {
              const fullImg = new Image();
              const fullUrl = getRecipeImageUrl(this.recipe?.id, this.recipe?.mainImageName);
              fullImg.src = fullUrl;
              fullImg.onload = () => (img.src = fullUrl);
            }
          }}
                />
              </a>
            `
        : nothing}
        <ion-card-header>
          <ion-card-title>${this.recipe?.name}</ion-card-title>
          ${(this.recipe?.tags?.length ?? 0) > 0
        ? html`
                <ion-card-subtitle class="tags">
                  ${this.recipe?.tags?.map(
          (tag) => html`
                      <ion-badge
                        color="medium"
                        @click=${() => emit(this, 'tagClicked', tag)}
                      >
                        ${tag}
                      </ion-badge>
                    `
        )}
                </ion-card-subtitle>
              `
        : nothing}
          <ion-card-subtitle class="details">
            <five-star-rating
              .value=${this.recipe?.rating ?? 0}
              ?disabled=${this.readonly}
              @valueSelected=${(e: CustomEvent<number>) => emit(this, 'ratingSelected', e.detail)}
            ></five-star-rating>
            ${!isNullOrEmpty(this.recipe?.servingSize) ? html`<div>Servings: ${this.recipe?.servingSize}</div>` : nothing}
            ${!isNullOrEmpty(this.recipe?.time) ? html`<div>Time: ${this.recipe?.time}</div>` : nothing}
            ${!isNullOrEmpty(this.recipe?.sourceUrl) ? html`<div>Source: ${this.getSourceLink(this.recipe?.sourceUrl)}</div>` : nothing}
            <div>${this.getRecipeDatesText(this.recipe?.createdAt, this.recipe?.modifiedAt)}</div>
          </ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          ${!isNullOrEmpty(this.recipe?.ingredients)
        ? html`
                <ion-list-header class="section" lines="full">
                  <ion-label>Ingredients</ion-label>
                </ion-list-header>
                <ion-item lines="none">
                  <html-viewer .value=${toPresentationHtml(this, this.recipe?.ingredients, this.recipe?.id)}></html-viewer>
                </ion-item>
              `
        : nothing}
          ${!isNullOrEmpty(this.recipe?.directions)
        ? html`
                <ion-list-header class="section" lines="full">
                  <ion-label>Directions</ion-label>
                </ion-list-header>
                <ion-item lines="none">
                  <html-viewer .value=${toPresentationHtml(this, this.recipe?.directions, this.recipe?.id)}></html-viewer>
                </ion-item>
              `
        : nothing}
          ${!isNullOrEmpty(this.recipe?.storageInstructions)
        ? html`
                <ion-list-header class="section" lines="full">
                  <ion-label>Storage Instructions</ion-label>
                </ion-list-header>
                <ion-item lines="none">
                  <html-viewer .value=${toPresentationHtml(this, this.recipe?.storageInstructions, this.recipe?.id)}></html-viewer>
                </ion-item>
              `
        : nothing}
          ${!isNullOrEmpty(this.recipe?.nutritionInfo)
        ? html`
                <ion-list-header class="section" lines="full">
                  <ion-label>Nutrition</ion-label>
                </ion-list-header>
                <ion-item lines="none">
                  <html-viewer .value=${toPresentationHtml(this, this.recipe?.nutritionInfo, this.recipe?.id)}></html-viewer>
                </ion-item>
              `
        : nothing}
          ${(this.links?.length ?? 0) > 0
        ? html`
                <ion-list class="links">
                  <ion-list-header class="section" lines="full">
                    <ion-label>Related Recipes</ion-label>
                  </ion-list-header>
                  ${this.links.map(
          (link) => html`
                      <ion-item-sliding>
                        <ion-item lines="none">
                          <ion-thumbnail slot="start" class="preview">
                            ${!isNullOrEmpty(link.mainImageName)
              ? html`<img loading="lazy" alt="" src=${ifDefined(getRecipeThumbnailUrl(link.id, link.mainImageName))} />`
              : nothing}
                          </ion-thumbnail>
                          <ion-label>
                            <ion-router-link href=${`/recipes/${link.id}`} color="dark">
                              ${link.name}
                            </ion-router-link>
                          </ion-label>
                        </ion-item>
                        ${!this.readonly
              ? html`
                              <ion-item-options side="start">
                                <ion-item-option
                                  color="danger"
                                  @click=${() => emit(this, 'deleteLinkClicked', link)}
                                >
                                  <ion-icon slot="start" icon="close"></ion-icon>
                                  Remove
                                </ion-item-option>
                              </ion-item-options>
                            `
              : nothing}
                      </ion-item-sliding>
                    `
        )}
                </ion-list>
              `
        : nothing}
        </ion-card-content>
        ${this.recipe?.state === RecipeState.Archived
        ? html`<ion-badge class="top-right-padded translucent" color="dark">Archived</ion-badge>`
        : nothing}
      </ion-card>
    `;
  }

  private getSourceLink(source: string | null | undefined) {
    if (source?.startsWith('http')) {
      return html`<a href=${source} target="_blank" rel="noopener noreferrer">${source}</a>`;
    }
    return source;
  }

  private getRecipeDatesText(createdAt: string | Date | null | undefined, modifiedAt: string | Date | null | undefined) {
    if (typeof createdAt === 'string') {
      createdAt = new Date(createdAt);
    }
    if (typeof modifiedAt === 'string') {
      modifiedAt = new Date(modifiedAt);
    }

    if (createdAt?.getTime() !== modifiedAt?.getTime()) {
      return html`
        <span>
          <span class="ion-text-nowrap">Created: ${formatDate(createdAt)}</span>;
          <span class="ion-text-nowrap">Last Modified: ${formatDate(modifiedAt)}</span>
        </span>
      `;
    }
    return html`<span class="ion-text-nowrap">Created: ${formatDate(createdAt)}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-viewer': RecipeViewer;
  }
}
