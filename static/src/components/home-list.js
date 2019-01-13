import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '../mixins/gomp-core-mixin.js';
import './recipe-card.js';
import '../shared-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class HomeList extends GompCoreMixin(GestureEventListeners(PolymerElement)) {
  static get template() {
    return html`
        <style include="shared-styles">
            :host {
                display: block;
            }
            article {
                margin-top: 1em;
            }
            header {
                font-size: 1.5em;
            }
            .outterContainer {
                @apply --layout-horizontal;
                @apply --layout-wrap;
            }
            paper-progress {
                width: 100%;
            }
            paper-fab.green {
                --paper-fab-background: var(--paper-green-500);
                --paper-fab-keyboard-focus-background: var(--paper-green-900);
                position: fixed;
                bottom: 16px;
                right: 16px;
            }
            recipe-card {
                --recipe-card: {
                    height: 150px;
                }
                --recipe-card-header: {
                    height: 65%;
                }
                --recipe-card-content: {
                    padding: 10px;
                }
                --recipe-card-rating-size: 14px;
                font-size: 0.9em;
            }
            a {
                float: right;
            }
            @media screen and (min-width: 993px) {
                .recipeContainer {
                    width: 16.6%;
                }
                recipe-card {
                    width: 96%;
                    margin: 2%;
                }
            }
            @media screen and (min-width: 601px) and (max-width: 992px) {
                .recipeContainer {
                    width: 33%;
                }
                recipe-card {
                    width: 96%;
                    margin: 2%;
                }
            }
            @media screen and (max-width: 600px) {
                .recipeContainer {
                    width: 50%;
                }
                recipe-card {
                    margin: 2%;
                    width: 96%;
                }
            }
        </style>

        <article>
            <header>[[title]]</header>
            <div class="outterContainer">
                <template is="dom-repeat" items="[[recipes]]">
                    <div class="recipeContainer">
                        <recipe-card recipe="[[item]]"></recipe-card>
                    </div>
                </template>
            </div>
            <a class="right" href="#!" on-tap="_onLinkTapped">[[title]] ([[total]]) &gt;&gt;</a>
        </article>

        <iron-ajax bubbles="" id="recipesAjax" url="/api/v1/recipes" params="{&quot;q&quot;:&quot;&quot;, &quot;tags&quot;: [], &quot;sort&quot;: &quot;random&quot;, &quot;dir&quot;: &quot;asc&quot;, &quot;page&quot;: 1, &quot;count&quot;: 6}" on-request="_handleGetRecipesRequest" on-response="_handleGetRecipesResponse"></iron-ajax>
`;
  }

  static get is() { return 'home-list'; }
  static get properties() {
      return {
          title: {
              type: String,
              notify: true,
              value: 'Recipes',
          },
          tags: {
              type: Array,
              notify: true,
              value: [],
              observer: '_tagsChanged',
          },
      };
  }

  _tagsChanged() {
      this.$.recipesAjax.params = {
          'q':'',
          'tags[]': this.tags,
          'sort': 'random',
          'dir': 'asc',
          'page': 1,
          'count': 6,
      };
  }

  refresh() {
      this.$.recipesAjax.generateRequest();
  }
  _handleGetRecipesRequest(e) {
      this.total = 0;
      this.recipes = [];
  }
  _handleGetRecipesResponse(e) {
      this.total = e.detail.response.total;
      this.recipes = e.detail.response.recipes;
  }
  _onLinkTapped(e) {
      e.preventDefault();

      this.dispatchEvent(new CustomEvent('home-list-link-clicked', {bubbles: true, composed: true, detail: {tags: this.tags}}));
  }
}

window.customElements.define(HomeList.is, HomeList);
