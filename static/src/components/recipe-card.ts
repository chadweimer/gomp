import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { GompCoreMixin } from '../mixins/gomp-core-mixin.js';
import '@polymer/paper-card/paper-card.js';
import './recipe-rating.js';
import '../shared-styles.js';

@customElement('recipe-card')
export class RecipeCard extends GompCoreMixin(PolymerElement) {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                    color: var(--primary-text-color);
                    cursor: pointer;

                    --paper-card-header: {
                        height: 75%;

                        @apply --recipe-card-header;
                    }
                    --paper-card-header-image: {
                        margin-top: -25%;
                    }
                    --paper-card-content: {
                        @apply --recipe-card-content;
                    }
                    --paper-card: {
                        width: 100%;
                        height: 250px;

                        @apply --recipe-card;
                    }
                    --recipe-rating-size: var(--recipe-card-rating-size, 18px);
                }
                paper-card:hover {
                    @apply --shadow-elevation-6dp;
                }
                .truncate {
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
          </style>

          <a href\$="/recipes/[[recipe.id]]">
              <paper-card image="[[recipe.thumbnailUrl]]">
                  <div class="card-content">
                      <span class="truncate">[[recipe.name]]</span>
                      <recipe-rating recipe="{{recipe}}"></recipe-rating>
                  </div>
              </paper-card>
          </a>
`;
    }

    @property({type: Object, notify: true})
    recipe: Object|null = null;
}
