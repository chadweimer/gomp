import { Component, Event, EventEmitter, Host, Prop, h } from '@stencil/core';
import { Recipe, RecipeCompact, RecipeImage, RecipeState } from '../../generated';
import { formatDate } from '../../helpers/utils';

@Component({
  tag: 'recipe-viewer',
  styleUrl: 'recipe-viewer.css',
  scoped: true,
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
          <ion-card-content>
            <ion-item lines="none">
              {this.mainImage ?
                <a class="ion-margin-end" href={this.mainImage.url} target="_blank">
                  <ion-avatar slot="start" class="large">
                    <img src={this.mainImage.thumbnailUrl} />
                  </ion-avatar>
                </a>
                : ''}
              <div>
                <h1>{this.recipe?.name}</h1>
                <five-star-rating value={this.rating} disabled={this.readonly}
                  onValueSelected={e => this.ratingSelected.emit(e.detail)} />
                <p><ion-note>{this.getRecipeDatesText(this.recipe?.createdAt, this.recipe?.modifiedAt)}</ion-note></p>
              </div>
              {this.recipe?.state === RecipeState.Archived
                ? <ion-badge class="top-right opacity-75 send-to-back" color="medium">Archived</ion-badge>
                : ''}
            </ion-item>
            {this.recipe?.servingSize ?
              <ion-item lines="full">
                <ion-label position="stacked">Serving Size</ion-label>
                <p class="plain ion-padding">{this.recipe?.servingSize}</p>
              </ion-item>
              : ''}
            {this.recipe?.ingredients ?
              <ion-item lines="full">
                <ion-label position="stacked">Ingredients</ion-label>
                <p class="plain ion-padding">{this.recipe?.ingredients}</p>
              </ion-item>
              : ''}
            {this.recipe?.directions ?
              <ion-item lines="full">
                <ion-label position="stacked">Directions</ion-label>
                <p class="plain ion-padding">{this.recipe?.directions}</p>
              </ion-item>
              : ''}
            {this.recipe?.storageInstructions ?
              <ion-item lines="full">
                <ion-label position="stacked">Storage/Freezer Instructions</ion-label>
                <p class="plain ion-padding">{this.recipe?.storageInstructions}</p>
              </ion-item>
              : ''}
            {this.recipe?.nutritionInfo ?
              <ion-item lines="full">
                <ion-label position="stacked">Nutrition</ion-label>
                <p class="plain ion-padding">{this.recipe?.nutritionInfo}</p>
              </ion-item>
              : ''}
            {this.recipe?.sourceUrl ?
              <ion-item lines="full">
                <ion-label position="stacked">Source</ion-label>
                <p class="plain ion-padding">
                  <a href={this.recipe?.sourceUrl} target="_blank" rel="noopener noreferrer">{this.recipe?.sourceUrl}</a>
                </p>
              </ion-item>
              : ''}
            {this.links?.length > 0 ?
              <ion-item lines="full">
                <ion-label position="stacked">Related Recipes</ion-label>
                <div class="ion-padding-top fill">
                  {this.links.map(link =>
                    <ion-item lines="none">
                      <ion-avatar slot="start">
                        {link.thumbnailUrl ? <img src={link.thumbnailUrl} /> : ''}
                      </ion-avatar>
                      <ion-label>
                        <ion-router-link href={`/recipes/${link.id}`} color="dark">
                          {link.name}
                        </ion-router-link>
                      </ion-label>
                      {!this.readonly ?
                        <ion-button slot="end" fill="clear" color="danger" onClick={() => this.deleteLinkClicked.emit(link)}>
                          <ion-icon slot="icon-only" icon="close-circle" />
                        </ion-button>
                        : ''}
                    </ion-item>
                  )}
                </div>
              </ion-item>
              : ''}
            <div class="ion-margin-top">
              {this.recipe?.tags?.map(tag =>
                <ion-chip onClick={() => this.tagClicked.emit(tag)}>{tag}</ion-chip>
              )}
            </div>
          </ion-card-content>
        </ion-card>
      </Host>
    );
  }

  private getRecipeDatesText(createdAt: string, modifiedAt: string) {
    if (createdAt !== modifiedAt) {
      return (
        <span>
          <span class="ion-text-nowrap">Created: {formatDate(createdAt)}</span>, <span class="ion-text-nowrap">Last Modified: {formatDate(modifiedAt)}</span>
        </span>
      );
    }
    return (
      <span class="ion-text-nowrap">Created: {formatDate(createdAt)}</span>
    );
  }
}
