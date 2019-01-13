import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@cwmr/iron-star-rating/iron-star-rating.js';
import '../mixins/gomp-core-mixin.js';
import '../shared-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class RecipeRating extends GompCoreMixin(GestureEventListeners(PolymerElement)) {
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

  static get is() { return 'recipe-rating'; }
  static get properties() {
      return {
          recipe: {
              type: Object,
              notify: true,
          },
      };
  }

  _starRatingSelected(e) {
      this.$.rateAjax.body = e.detail.rating;
      this.$.rateAjax.generateRequest();
  }
  _handlePutRecipeRatingResponse(e) {
      this.set('recipe.averageRating', parseFloat(e.target.body));
      this.showToast('Rating changed.');
      this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
  }
  _handlePutRecipeRatingError(e) {
      this.showToast('Changing rating failed!');
  }
}

window.customElements.define(RecipeRating.is, RecipeRating);
