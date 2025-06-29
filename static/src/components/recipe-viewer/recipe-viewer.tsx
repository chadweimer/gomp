import { Component, Event, EventEmitter, Host, Prop, h } from '@stencil/core';
import { Recipe, RecipeCompact, RecipeImage, RecipeState } from '../../generated';
import { formatDate, isNull, isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'recipe-viewer',
  styleUrl: 'recipe-viewer.css',
  shadow: true,
})
export class RecipeViewer {
  @Prop() recipe: Recipe = null;
  @Prop() mainImage: RecipeImage = null;
  @Prop() links: RecipeCompact[] = [];
  @Prop() rating = 0;
  @Prop() readonly = false;

  @Event() ratingSelected: EventEmitter<number>;
  @Event() deleteLinkClicked: EventEmitter<RecipeCompact>;
  @Event() tagClicked: EventEmitter<string>;

  render() {
    return (
      <Host>
        <ion-card>
          {!isNull(this.mainImage) && (
            <a href={this.mainImage.url} target="_blank" rel="noopener noreferrer">
              <img
                class="main"
                alt={this.mainImage.url}
                src={this.mainImage.thumbnailUrl}
                onLoad={e => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (img.src.endsWith(this.mainImage.thumbnailUrl)) {
                    const fullImg = new Image();
                    fullImg.src = this.mainImage.url;
                    fullImg.onload = () => img.src = this.mainImage.url;
                  }
                }}
              />
            </a>
          )}
          <ion-card-header>
            <ion-card-title>{this.recipe?.name}</ion-card-title>
            <ion-card-subtitle>
              <five-star-rating value={this.rating} disabled={this.readonly} onValueSelected={e => this.ratingSelected.emit(e.detail)} />
              {!isNullOrEmpty(this.recipe?.servingSize) && <div>Servings: {this.recipe?.servingSize}</div>}
              {!isNullOrEmpty(this.recipe?.time) && <div>Time: {this.recipe?.time}</div>}
              <div>{this.getRecipeDatesText(this.recipe?.createdAt, this.recipe?.modifiedAt)}</div>
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            {!isNullOrEmpty(this.recipe?.ingredients) &&
              <ion-item lines="full">
                <ion-label position="stacked">Ingredients</ion-label>
                <html-viewer class="ion-padding" value={this.recipe?.ingredients} />
              </ion-item>
            }
            {!isNullOrEmpty(this.recipe?.directions) &&
              <ion-item lines="full">
                <ion-label position="stacked">Directions</ion-label>
                <html-viewer class="ion-padding" value={this.recipe?.directions} />
              </ion-item>
            }
            {!isNullOrEmpty(this.recipe?.storageInstructions) &&
              <ion-item lines="full">
                <ion-label position="stacked">Storage Instructions</ion-label>
                <html-viewer class="ion-padding" value={this.recipe?.storageInstructions} />
              </ion-item>
            }
            {!isNullOrEmpty(this.recipe?.nutritionInfo) &&
              <ion-item lines="full">
                <ion-label position="stacked">Nutrition</ion-label>
                <html-viewer class="ion-padding" value={this.recipe?.nutritionInfo} />
              </ion-item>
            }
            {!isNullOrEmpty(this.recipe?.sourceUrl) &&
              <ion-item lines="full">
                <ion-label position="stacked">Source</ion-label>
                <div class="plain ion-padding">
                  <a href={this.recipe?.sourceUrl} target="_blank" rel="noopener noreferrer">{this.recipe?.sourceUrl}</a>
                </div>
              </ion-item>
            }
            {this.links?.length > 0 &&
              <ion-item lines="full">
                <ion-label position="stacked">Related Recipes</ion-label>
                <div class="ion-padding-top fill">
                  {this.links.map(link =>
                    <ion-item key={link.id} lines="none">
                      <ion-thumbnail slot="start" class="preview">
                        {!isNullOrEmpty(link.thumbnailUrl) && <ion-img alt="" src={link.thumbnailUrl} />}
                      </ion-thumbnail>
                      <ion-label>
                        <ion-router-link href={`/recipes/${link.id}`} color="dark">
                          {link.name}
                        </ion-router-link>
                      </ion-label>
                      {!this.readonly &&
                        <ion-button slot="end" fill="clear" color="danger" onClick={() => this.deleteLinkClicked.emit(link)}>
                          <ion-icon slot="icon-only" icon="close-circle" />
                        </ion-button>
                      }
                    </ion-item>
                  )}
                </div>
              </ion-item>
            }
            <div class="ion-margin-top">
              {this.recipe?.tags?.map(tag =>
                <ion-chip key={tag} onClick={() => this.tagClicked.emit(tag)}>{tag}</ion-chip>
              )}
            </div>
          </ion-card-content>
          {this.recipe?.state === RecipeState.Archived &&
            <ion-badge class="top-right-padded opacity-75" color="medium">Archived</ion-badge>}
        </ion-card>
      </Host>
    );
  }

  private getRecipeDatesText(createdAt: Date | null, modifiedAt: Date | null) {
    if (createdAt?.getTime() !== modifiedAt?.getTime()) {
      return (
        <span>
          <span class="ion-text-nowrap">Created: {formatDate(createdAt)}</span>; <span class="ion-text-nowrap">Last Modified: {formatDate(modifiedAt)}</span>
        </span>
      );
    }
    return (
      <span class="ion-text-nowrap">Created: {formatDate(createdAt)}</span>
    );
  }
}
