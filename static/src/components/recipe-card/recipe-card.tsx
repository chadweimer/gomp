import { Component, Host, h, Prop, State, Watch } from '@stencil/core';
import { RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import { getRecipeThumbnailUrl, isNull, isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'recipe-card',
  styleUrl: 'recipe-card.css',
  shadow: true,
})
export class RecipeCard {
  private tagsContainer?: HTMLElement;
  private probeBadgeElement?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private readonly tagWidths: Map<string, number> = new Map();

  @Prop() recipe: RecipeCompact = {
    name: '',
    state: RecipeState.Active,
    mainImageName: '',
    rating: 0,
    tags: []
  };

  @State() visibleCount?: number;

  @Watch('recipe')
  recipeChanged() {
    this.tagWidths.clear();
    this.visibleCount = undefined;
    this.calculateVisibleTags();
  }

  componentDidLoad() {
    if (typeof ResizeObserver !== 'undefined' && this.tagsContainer) {
      this.resizeObserver = new ResizeObserver(() => {
        this.calculateVisibleTags();
      });
      this.resizeObserver.observe(this.tagsContainer);
    }
    this.calculateVisibleTags();
  }

  componentDidUpdate() {
    this.calculateVisibleTags();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
  }

  render() {
    const tags = this.recipe?.tags ?? [];
    const count = this.visibleCount ?? tags.length;
    const visibleTags = tags.slice(0, count);
    const hiddenTags = tags.slice(count);

    return (
      <Host>
        <ion-card href={isNull(this.recipe?.id) ? '' : `/recipes/${this.recipe?.id}`}>
          <div class="image-container">
            <img loading="lazy" class={{ image: true, hidden: isNullOrEmpty(this.recipe?.mainImageName) }} alt="" src={getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName)} />
            {visibleTags.length > 0 &&
              <div class="tags" ref={el => this.tagsContainer = el}>
                {visibleTags.map((tag) =>
                  <ion-badge
                    key={tag}
                    class={{ 'tag-badge': true, 'translucent': true, 'truncate-single': tags.length === 1 || (visibleTags.length === 1 && hiddenTags.length > 0) }}
                    color="light"
                    title={tag}
                    data-tag={tag}
                  >
                    {tag}
                  </ion-badge>
                )}
                {hiddenTags.length > 0 &&
                  <ion-badge
                    class="more-badge translucent"
                    color="light"
                    title={hiddenTags.join(', ')}
                  >
                    +{hiddenTags.length}
                  </ion-badge>
                }
                <ion-badge
                  class="probe-badge translucent"
                  color="light"
                  aria-hidden="true"
                  ref={el => this.probeBadgeElement = el}
                >
                  +{tags.length}
                </ion-badge>
              </div>
            }
          </div>
          <ion-card-header class="header">
            <ion-card-title class="single-line title" title={this.recipe?.name}>
              {this.recipe?.name}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content class="no-overflow content">
            <five-star-rating value={this.recipe?.rating ?? 0} disabled />
          </ion-card-content>
          {this.recipe?.state === RecipeState.Archived &&
            <ion-badge class="top-right-padded translucent" color="light">Archived</ion-badge>}
        </ion-card>
      </Host>
    );
  }

  private getBadgeWidth(hiddenCount: number): number {
    if (!this.probeBadgeElement) return 36;
    this.probeBadgeElement.textContent = `+${hiddenCount}`;
    const width = this.probeBadgeElement.getBoundingClientRect().width;
    return width > 0 ? width : 36;
  }

  private calculateVisibleTags() {
    if (!this.tagsContainer) return;
    const containerWidth = this.tagsContainer.clientWidth;
    const tags = this.recipe?.tags ?? [];

    if (containerWidth <= 0 || tags.length <= 1) {
      if (this.visibleCount !== tags.length) {
        this.visibleCount = tags.length;
      }
      return;
    }

    // Cache intrinsic widths from rendered elements
    const badges = this.tagsContainer.querySelectorAll<HTMLElement>('.tag-badge');
    badges.forEach(el => {
      const tag = el.dataset.tag;
      if (tag) {
        const w = el.getBoundingClientRect().width;
        if (w > 0) {
          this.tagWidths.set(tag, w);
        }
      }
    });

    const gap = 8;
    let totalWidth = 0;
    let fitsAll = true;

    for (let i = 0; i < tags.length; i++) {
      const w = this.tagWidths.get(tags[i]) ?? 50;
      if (i > 0) totalWidth += gap;
      totalWidth += w;
      if (totalWidth > containerWidth) {
        fitsAll = false;
        break;
      }
    }

    if (fitsAll) {
      if (this.visibleCount !== tags.length) {
        this.visibleCount = tags.length;
      }
      return;
    }

    let count = 0;
    let currentWidth = 0;
    for (let k = 1; k < tags.length; k++) {
      const badgeW = this.getBadgeWidth(tags.length - k);
      const availableForTags = containerWidth - badgeW - gap;
      const w = this.tagWidths.get(tags[k - 1]) ?? 50;
      const nextWidth = currentWidth + (k > 1 ? gap : 0) + w;
      if (nextWidth <= availableForTags) {
        currentWidth = nextWidth;
        count = k;
      } else {
        break;
      }
    }

    const newVisibleCount = Math.max(1, count);
    if (this.visibleCount !== newVisibleCount) {
      this.visibleCount = newVisibleCount;
    }
  }
}
