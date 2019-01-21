'use strict'
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { GompCoreMixin } from '../mixins/gomp-core-mixin.js';
import '@cwmr/iron-star-rating/iron-star-rating.js';
import '../shared-styles.js';

@customElement('recipe-rating')
export class RecipeRating extends GompCoreMixin(PolymerElement) {
    static get template() {
        return html`
            <style include="shared-styles">
               :host {
                   --star-rating-size: var(--recipe-rating-size);
                }
          </style>

          <iron-star-rating value="[[recipe.averageRating]]" on-rating-selected="_starRatingSelected"></iron-star-rating>

          <iron-ajax bubbles="" id="rateAjax" url="/api/v1/recipes/[[recipe.id]]/rating" method="PUT" on-response="_handlePutRecipeRatingResponse" on-error="_handlePutRecipeRatingError"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    recipe: Object|null = null;

    _starRatingSelected(e: CustomEvent) {
        let rateAjax = this.$.rateAjax as IronAjaxElement;
        rateAjax.body = e.detail.rating;
        rateAjax.generateRequest();
    }
    _handlePutRecipeRatingResponse(e: CustomEvent) {
        let rateAjax = e.target as IronAjaxElement;
        this.set('recipe.averageRating', parseFloat((<object>rateAjax.body).toString()));
        this.showToast('Rating changed.');
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    _handlePutRecipeRatingError() {
        this.showToast('Changing rating failed!');
    }
}
