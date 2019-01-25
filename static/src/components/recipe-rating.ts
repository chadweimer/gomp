'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { GompBaseElement } from '../common/gomp-base-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@cwmr/iron-star-rating/iron-star-rating.js';
import '../shared-styles.js';

@customElement('recipe-rating')
export class RecipeRating extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
               :host {
                   --star-rating-size: var(--recipe-rating-size);
                }
          </style>

          <iron-star-rating value="[[recipe.averageRating]]" on-rating-selected="starRatingSelected"></iron-star-rating>

          <iron-ajax bubbles="" id="rateAjax" url="/api/v1/recipes/[[recipe.id]]/rating" method="PUT" on-response="handlePutRecipeRatingResponse" on-error="handlePutRecipeRatingError"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    public recipe: object|null = null;

    private get rateAjax(): IronAjaxElement {
        return this.$.rateAjax as IronAjaxElement;
    }

    protected starRatingSelected(e: CustomEvent) {
        this.rateAjax.body = e.detail.rating;
        this.rateAjax.generateRequest();
    }
    protected handlePutRecipeRatingResponse(_: CustomEvent) {
        this.set('recipe.averageRating', parseFloat(this.rateAjax.body.toString()));
        this.showToast('Rating changed.');
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    protected handlePutRecipeRatingError() {
        this.showToast('Changing rating failed!');
    }
}
