'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { Recipe } from '../models/models.js';
import '@cwmr/mwc-star-rating';
import '../shared-styles.js';

@customElement('recipe-rating')
export class RecipeRating extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
               :host {
                   --mwc-star-rating-size: var(--recipe-rating-size);
                }
          </style>

          <mwc-star-rating value="[[recipe.averageRating]]" on-rating-selected="starRatingSelected" readonly\$="[[readonly]]"></mwc-star-rating>
`;
    }

    @property({type: Object, notify: true})
    public recipe: Recipe = null;

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected async starRatingSelected(e: CustomEvent<{rating: number}>) {
        const newRating = e.detail.rating;
        try {
            await this.AjaxPut(`/api/v1/recipes/${this.recipe.id}/rating`, newRating);
            this.set('recipe.averageRating', newRating);
            this.showToast('Rating changed.');
            this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
        } catch (e) {
            this.showToast('Changing rating failed!');
            console.error(e);
        }
    }
}
