import { Component, Element, Event, EventEmitter, Host, Prop, h } from '@stencil/core';
import { Recipe, RecipeCompact, RecipeState } from '../../helpers/schema.gen';
import { formatDate, getRecipeImageUrl, getRecipeThumbnailUrl, isNullOrEmpty, toPresentationHtml } from '../../helpers/utils';

@Component({
  tag: 'recipe-viewer',
  styleUrl: 'recipe-viewer.css',
  shadow: true,
})
export class RecipeViewer {
  @Prop() recipe: Recipe | null = null;
  @Prop() links: RecipeCompact[] = [];
  @Prop() readonly = false;
  @Element() el!: HTMLRecipeViewerElement;

  @Event() ratingSelected!: EventEmitter<number>;
  @Event() deleteLinkClicked!: EventEmitter<RecipeCompact>;
  @Event() tagClicked!: EventEmitter<string>;

  render() {
    return (
      <Host>
        <ion-card>
          {!isNullOrEmpty(this.recipe?.mainImageName) && (
            <a href={getRecipeImageUrl(this.recipe?.id, this.recipe?.mainImageName)} target="_blank" rel="noopener noreferrer">
              <img
                class="main zoom"
                alt={this.recipe?.name}
                src={getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName)}
                onLoad={e => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!isNullOrEmpty(this.recipe?.mainImageName) && img.src.endsWith(getRecipeThumbnailUrl(this.recipe?.id, this.recipe?.mainImageName))) {
                    const fullImg = new Image();
                    fullImg.src = getRecipeImageUrl(this.recipe?.id, this.recipe?.mainImageName);
                    fullImg.onload = () => img.src = getRecipeImageUrl(this.recipe?.id, this.recipe?.mainImageName);
                  }
                }}
              />
            </a>
          )}
          <ion-card-header>
            <ion-card-title>{this.recipe?.name}</ion-card-title>
            <ion-card-subtitle class="tags">
              {this.recipe?.tags?.map(tag =>
                <ion-badge key={tag} color="medium" onClick={() => this.tagClicked.emit(tag)}>{tag}</ion-badge>
              )}
            </ion-card-subtitle>
            <ion-card-subtitle class="details">
              <five-star-rating value={this.recipe?.rating} disabled={this.readonly} onValueSelected={e => this.ratingSelected.emit(e.detail)} />
              {!isNullOrEmpty(this.recipe?.servingSize) && <div>Servings: {this.recipe?.servingSize}</div>}
              {!isNullOrEmpty(this.recipe?.time) && <div>Time: {this.recipe?.time}</div>}
              {!isNullOrEmpty(this.recipe?.sourceUrl) && <div>Source: <a href={this.recipe?.sourceUrl} target="_blank" rel="noopener noreferrer">{this.recipe?.sourceUrl}</a></div>}
              <div>{this.getRecipeDatesText(this.recipe?.createdAt, this.recipe?.modifiedAt)}</div>
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            {!isNullOrEmpty(this.recipe?.ingredients) && [
              <ion-list-header lines="full">
                <ion-label>Ingredients</ion-label>
              </ion-list-header>,
              <ion-item lines="none">
                <html-viewer value={toPresentationHtml(this.el, this.recipe?.ingredients, this.recipe?.id)} />
              </ion-item>
            ]}
            {!isNullOrEmpty(this.recipe?.directions) && [
              <ion-list-header lines="full">
                <ion-label>Directions</ion-label>
              </ion-list-header>,
              <ion-item lines="none">
                <html-viewer value={toPresentationHtml(this.el, this.recipe?.directions, this.recipe?.id)} />
              </ion-item>
            ]}
            {!isNullOrEmpty(this.recipe?.storageInstructions) && [
              <ion-list-header lines="full">
                <ion-label>Storage Instructions</ion-label>
              </ion-list-header>,
              <ion-item lines="none">
                <html-viewer value={toPresentationHtml(this.el, this.recipe?.storageInstructions, this.recipe?.id)} />
              </ion-item>
            ]}
            {!isNullOrEmpty(this.recipe?.nutritionInfo) && [
              <ion-list-header lines="full">
                <ion-label>Nutrition</ion-label>
              </ion-list-header>,
              <ion-item lines="none">
                <html-viewer value={toPresentationHtml(this.el, this.recipe?.nutritionInfo, this.recipe?.id)} />
              </ion-item>
            ]}
            {this.links?.length > 0 &&
              <ion-list class="links">
                <ion-list-header lines="full">
                  <ion-label>Related Recipes</ion-label>
                </ion-list-header>
                {this.links.map(link =>
                  <ion-item-sliding key={link.id}>
                    <ion-item lines="none">
                      <ion-thumbnail slot="start" class="preview">
                        {!isNullOrEmpty(link.mainImageName) && <img loading="lazy" alt="" src={getRecipeThumbnailUrl(link.id, link.mainImageName)} />}
                      </ion-thumbnail>
                      <ion-label>
                        <ion-router-link href={`/recipes/${link.id}`} color="dark">
                          {link.name}
                        </ion-router-link>
                      </ion-label>
                    </ion-item>
                    {!this.readonly &&
                      <ion-item-options side="start">
                        <ion-item-option color="danger" onClick={() => this.deleteLinkClicked.emit(link)}>
                          <ion-icon slot="start" icon="close" />
                          Remove
                        </ion-item-option>
                      </ion-item-options>
                    }
                  </ion-item-sliding>
                )}
              </ion-list>
            }
          </ion-card-content>
          {this.recipe?.state === RecipeState.Archived &&
            <ion-badge class="top-right-padded translucent" color="dark">Archived</ion-badge>}
        </ion-card>
      </Host>
    );
  }

  private getRecipeDatesText(createdAt: string | Date | null | undefined, modifiedAt: string | Date | null | undefined) {
    // If createdAt is a string, convert it to a Date object
    if (typeof createdAt === 'string') {
      createdAt = new Date(createdAt);
    }

    if (typeof modifiedAt === 'string') {
      modifiedAt = new Date(modifiedAt);
    }

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
