import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import { getRecipeThumbnailUrl, isNull, isNullOrEmpty } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import '../five-star-rating/five-star-rating';

const TAG_GAP = 8;
const DEFAULT_TAG_WIDTH = 50;
const DEFAULT_BADGE_WIDTH = 36;

@customElement('recipe-card')
export class RecipeCard extends LitElement {
  static readonly styles = [
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

      .tags {
        position: absolute;
        bottom: var(--ion-padding, 8px);
        left: var(--ion-padding, 8px);
        right: var(--ion-padding, 8px);
        display: flex;
        flex-wrap: nowrap;
        gap: var(--ion-padding, 8px);
        overflow: hidden;
        z-index: 1;
      }

      .tags ion-badge {
        flex-shrink: 0;
        white-space: nowrap;
      }

      .tags ion-badge.truncate-single {
        flex-shrink: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tags .more-badge {
        flex-shrink: 0;
      }

      .probe-badge {
        position: absolute;
        visibility: hidden;
        pointer-events: none;
        top: -9999px;
        left: -9999px;
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
    `
  ];

  @property({ type: Object }) recipe: RecipeCompact = {
    name: '',
    state: RecipeState.Active,
    mainImageName: '',
    rating: 0,
    tags: [],
  };

  @state() private visibleCount?: number;

  @query('.tags') private tagsContainer?: HTMLElement;
  @query('.probe-badge') private probeBadgeElement?: HTMLElement;

  private resizeObserver?: ResizeObserver;
  private readonly tagWidths: Map<string, number> = new Map();

  firstUpdated() {
    if (typeof ResizeObserver !== 'undefined' && this.tagsContainer) {
      this.resizeObserver = new ResizeObserver(() => {
        this.calculateVisibleTags();
      });
      this.resizeObserver.observe(this.tagsContainer);
    }
    const tags = this.recipe?.tags ?? [];
    if (tags.length > 1) {
      this.calculateVisibleTags();
    }
  }

  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('recipe') && changedProperties.get('recipe') !== undefined) {
      this.tagWidths.clear();
      this.visibleCount = undefined;
      this.calculateVisibleTags();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  render() {
    const tags = this.recipe?.tags ?? [];
    const count = this.visibleCount ?? tags.length;
    const visibleTags = tags.slice(0, count);
    const hiddenTags = tags.slice(count);

    return html`
      <ion-card class="card" href=${ifDefined(isNull(this.recipe?.id) ? undefined : `/recipes/${this.recipe?.id}`)}>
        <div class="image-container">
          <img
            loading="lazy"
            class=${classMap({ image: true, hidden: isNullOrEmpty(this.recipe?.mainImageName) })}
            alt=""
            src=${ifDefined(getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName))}
          />
          ${tags.length > 0
        ? html`
                <div class="tags">
                  ${visibleTags.map(
          (tag) => html`
                      <ion-badge
                        class=${classMap({
            'tag-badge': true,
            translucent: true,
            'truncate-single': tags.length === 1 || (visibleTags.length === 1 && hiddenTags.length > 0),
          })}
                        color="light"
                        title=${tag}
                        data-tag=${tag}
                      >
                        ${tag}
                      </ion-badge>
                    `
        )}
                  ${hiddenTags.length > 0
            ? html`
                        <ion-badge
                          class="more-badge translucent"
                          color="light"
                          title=${hiddenTags.join(', ')}
                        >
                          +${hiddenTags.length}
                        </ion-badge>
                      `
            : ''}
                  <ion-badge
                    class="probe-badge translucent"
                    color="light"
                    aria-hidden="true"
                  ></ion-badge>
                </div>
              `
        : ''}
        </div>
        <ion-card-header class="header">
          <ion-card-title class="single-line title" title=${ifDefined(this.recipe?.name)}>
            ${this.recipe?.name}
          </ion-card-title>
        </ion-card-header>
        <ion-card-content class="content">
          <five-star-rating .value=${this.recipe?.rating ?? 0} ?disabled=${true}></five-star-rating>
        </ion-card-content>
        ${this.recipe?.state === RecipeState.Archived
        ? html`<ion-badge class="top-right-padded translucent" color="light">Archived</ion-badge>`
        : ''}
      </ion-card>
    `;
  }

  private getBadgeWidth(hiddenCount: number): number {
    if (!this.probeBadgeElement) return DEFAULT_BADGE_WIDTH;
    this.probeBadgeElement.textContent = `+${hiddenCount}`;
    const width = this.probeBadgeElement.getBoundingClientRect().width;
    return width > 0 ? width : DEFAULT_BADGE_WIDTH;
  }

  private getTagWidth(tag: string): number {
    return this.tagWidths.get(tag) ?? DEFAULT_TAG_WIDTH;
  }

  private setVisibleCount(count: number) {
    if (this.visibleCount !== count) {
      this.visibleCount = count;
    }
  }

  private cacheTagWidths() {
    const badges = this.tagsContainer?.querySelectorAll<HTMLElement>('.tag-badge');
    badges?.forEach((el) => {
      const tag = el.dataset.tag;
      const width = el.getBoundingClientRect().width;
      if (tag && width > 0) {
        this.tagWidths.set(tag, width);
      }
    });
  }

  private canFitAllTags(tags: string[], containerWidth: number): boolean {
    let totalWidth = 0;
    for (let i = 0; i < tags.length; i++) {
      const spacing = i > 0 ? TAG_GAP : 0;
      totalWidth += spacing + this.getTagWidth(tags[i]);
      if (totalWidth > containerWidth) {
        return false;
      }
    }
    return true;
  }

  private calculateOverflowVisibleCount(tags: string[], containerWidth: number): number {
    let count = 0;
    let currentWidth = 0;

    for (let k = 1; k < tags.length; k++) {
      const badgeW = this.getBadgeWidth(tags.length - k);
      const availableForTags = containerWidth - badgeW - TAG_GAP;
      const spacing = k > 1 ? TAG_GAP : 0;
      const nextWidth = currentWidth + spacing + this.getTagWidth(tags[k - 1]);
      if (nextWidth > availableForTags) {
        break;
      }
      currentWidth = nextWidth;
      count = k;
    }

    return Math.max(1, count);
  }

  calculateVisibleTags() {
    const container = this.shadowRoot?.querySelector('.tags') as HTMLElement | null;
    const containerWidth = container?.clientWidth ?? 0;
    const tags = this.recipe?.tags ?? [];

    if (containerWidth <= 0 || tags.length <= 1) {
      if (this.visibleCount !== undefined) {
        this.setVisibleCount(tags.length);
      }
      return;
    }

    this.cacheTagWidths();

    if (this.canFitAllTags(tags, containerWidth)) {
      this.setVisibleCount(tags.length);
      return;
    }

    this.setVisibleCount(this.calculateOverflowVisibleCount(tags, containerWidth));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'recipe-card': RecipeCard;
  }
}
