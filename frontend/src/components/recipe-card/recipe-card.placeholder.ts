import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import { getRecipeThumbnailUrl, isNull, isNullOrEmpty } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import { classMap } from 'lit-html/directives/class-map.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';

@customElement('recipe-card')
export class RecipeCardPlaceholder extends LitElement {
  static styles = [
    globalStyles,
    css`
    :host {
      display: block;
      overflow: visible;
    }
    .image-container {
      position: relative;
      width: 100%;
      height: 120px;
      overflow: hidden;
    }
    .image {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
    .hidden {
      display: none;
    }
    .card {
      margin: var(--ion-margin, 8px);
    }
    .content {
      padding: var(--ion-padding, 8px);
      padding-top: 2px;
      overflow: hidden;
    }
    .header {
      padding: var(--ion-padding, 8px);
      padding-bottom: 2px;
    }
    .title {
      font-size: 0.9rem;
    }
    .single-line {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .top-right-padded {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  `];

  @property({ type: Object }) recipe: RecipeCompact = {
    name: '',
    state: RecipeState.Active,
    mainImageName: '',
    rating: 0,
    tags: []
  };

  render() {
    return html`
      <ion-card class="card" href=${isNull(this.recipe?.id) ? '' : `/recipes/${this.recipe?.id}`}>
        <div class="image-container">
          <img
            loading="lazy"
            class=${classMap({
      'image': true,
      'hidden': isNullOrEmpty(this.recipe?.mainImageName)
    })}
            alt=""
            src=${getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName)}
          />
        </div>
        <ion-card-header class="header">
          <ion-card-title class="single-line title" title=${ifDefined(this.recipe?.name)}>
            ${this.recipe?.name ?? ''}
          </ion-card-title>
        </ion-card-header>
        ${this.recipe?.state === RecipeState.Archived && html`
          <ion-badge class="top-right-padded" color="light">Archived</ion-badge>
        `}
      </ion-card>
    `;
  }
}
