import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { AppDrawerElement } from '@polymer/app-layout/app-drawer/app-drawer.js';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompCoreMixin } from './mixins/gomp-core-mixin.js';
import '@polymer/app-layout/app-drawer-layout/app-drawer-layout.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/av-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-styles/paper-styles.js';
import '@cwmr/paper-divider/paper-divider.js';
import './components/recipe-card.js';
import './components/pagination-links.js';
import './components/recipe-rating.js';
import './shared-styles.js';

@customElement('search-view')
export class SearchView extends GompCoreMixin(PolymerElement) {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                    --paper-button: {
                        min-width: 2.5em;
                        height: 2.5em;
                        margin: 0 0.17em;
                    }
                    --paper-item-selected: {
                        background: var(--light-accent-color);
                        color: white;
                    }
                }
                .section {
                    padding: 8px;
                }
                .outterContainer {
                    @apply --layout-horizontal;
                    @apply --layout-wrap;
                }
                .pagination {
                    @apply --layout-horizontal;
                    @apply --layout-center-justified;
                    margin: 0.35em;
                }
                paper-fab.green {
                    --paper-fab-background: var(--paper-green-500);
                    --paper-fab-keyboard-focus-background: var(--paper-green-900);
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                }
                .menu-trigger {
                    background: var(--paper-grey-600);
                    color: white;
                }
                paper-icon-item {
                    cursor: pointer;
               }
              .avatar {
                    width: 32px;
                    height: 32px;
                    border: 1px solid rgba(0, 0, 0, 0.25);
                    border-radius: 50%;
                }
                #settingsIcon {
                    cursor: pointer;
                    float: right;
                    color: var(--paper-grey-800);
                }
                .menu-label {
                    min-height: 48px;
                    height: 48px;
                    padding: 0 16px;
                    font-size: 14px !important;
                    color: var(--secondary-text-color);
                    @apply --paper-font-subhead;
                    @apply --layout-horizontal;
                    @apply --layout-center;
                    cursor: default;
                }
                .compact-rating {
                    --recipe-rating-size: 13px;
                }
                @media screen and (min-width: 993px) {
                    .recipeContainer {
                        width: 33%;
                    }
                    recipe-card {
                        width: 96%;
                        margin: 2%;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    .recipeContainer {
                        width: 50%;
                    }
                    recipe-card {
                        width: 96%;
                        margin: 2%;
                    }
                }
                @media screen and (max-width: 600px) {
                    .recipeContainer {
                        width: 100%;
                    }
                    recipe-card {
                        margin: 2%;
                        width: 96%;
                    }
                }
          </style>

          <app-drawer-layout force-narrow="">
              <app-drawer id="settingsDrawer" align="right" slot="drawer">
                  <!-- This is here simply to be a spacer since this shows behind the app toolbar -->
                  <app-toolbar></app-toolbar>

                  <label class="menu-label">View</label>
                  <paper-listbox class="menu-content" selected="[[searchSettings.viewMode]]" attr-for-selected="name" fallback-selection="full">
                      <paper-icon-item name="full" on-click="_onFullViewClicked"><iron-icon icon="view-agenda" slot="item-icon"></iron-icon> Full</paper-icon-item>
                     b<paper-icon-item name="compact" on-click="_onCompactViewClicked"><iron-icon icon="view-headline" slot="item-icon"></iron-icon> Compact</paper-icon-item>
                  </paper-listbox>
                  <paper-divider></paper-divider>
                  <label class="menu-label">Sort</label>
                  <paper-listbox class="menu-content" selected="[[searchSettings.sortBy]]" attr-for-selected="name" fallback-selection="name">
                      <paper-icon-item name="name" on-click="_onNameSortClicked"><iron-icon icon="av:sort-by-alpha" slot="item-icon"></iron-icon> Name</paper-icon-item>
                      <paper-icon-item name="rating" on-click="_onRatingSortClicked"><iron-icon icon="stars" slot="item-icon"></iron-icon> Rating</paper-icon-item>
                      <paper-icon-item name="random" on-click="_onRandomSortClicked"><iron-icon icon="help" slot="item-icon"></iron-icon> Random<paper-icon-item>
                  </paper-icon-item></paper-icon-item></paper-listbox>
                  <paper-divider></paper-divider>
                  <label class="menu-label">Order</label>
                  <paper-listbox class="menu-content" selected="[[searchSettings.sortDir]]" attr-for-selected="name" fallback-selection="asc">
                      <paper-icon-item name="asc" on-click="_onAscSortClicked"><iron-icon icon="arrow-upward" slot="item-icon"></iron-icon> ASC</paper-icon-item>
                      <paper-icon-item name="desc" on-click="_onDescSortClicked"><iron-icon icon="arrow-downward" slot="item-icon"></iron-icon> DESC</paper-icon-item>
                  </paper-listbox>
              </app-drawer>

              <div class="section">
                  <div>
                      <span>[[totalRecipeCount]] results</span>
                      <iron-icon id="settingsIcon" icon="icons:sort" drawer-toggle=""></iron-icon>
                  </div>
                  <div class="pagination">
                      <pagination-links page-num="{{pageNum}}" num-pages="[[numPages]]"></pagination-links>
                  </div>
                  <div class="outterContainer">
                      <template is="dom-if" if="[[_areEqual(searchSettings.viewMode, 'full')]]" restamp="">
                          <template is="dom-repeat" items="[[recipes]]">
                              <div class="recipeContainer">
                                  <recipe-card recipe="[[item]]"></recipe-card>
                              </div>
                          </template>
                      </template>
                      <template is="dom-if" if="[[_areEqual(searchSettings.viewMode, 'compact')]]" restamp="">
                          <template is="dom-repeat" items="[[_columnize(recipes, 3)]]" as="inner">
                              <div class="recipeContainer">
                                  <template is="dom-repeat" items="[[inner]]" as="recipe">
                                      <a href="/recipes/[[recipe.id]]">
                                         <paper-icon-item>
                                             <img src="[[recipe.thumbnailUrl]]" class="avatar" slot="item-icon">
                                             <paper-item-body>
                                                 <div>[[recipe.name]]</div>
                                                 <div secondary="">
                                                      <recipe-rating recipe="{{recipe}}" class="compact-rating"></recipe-rating>
                                                  </div>
                                             </paper-item-body>
                                          </paper-icon-item>
                                      </a>
                                  </template>
                              </div>
                          </template>
                      </template>
                  </div>
                  <div class="pagination">
                      <pagination-links page-num="{{pageNum}}" num-pages="[[numPages]]"></pagination-links>
                  </div>
              </div>
              <a href="/create"><paper-fab icon="icons:add" class="green"></paper-fab></a>
          </app-drawer-layout>

          <app-localstorage-document key="searchSettings" data="{{searchSettings}}" session-only=""></app-localstorage-document>
          <iron-ajax bubbles="" auto="" id="recipesAjax" url="/api/v1/recipes" on-request="_handleGetRecipesRequest" on-response="_handleGetRecipesResponse" on-error="_handleGetRecipesError" debounce-duration="100"></iron-ajax>
`;
    }

    @property({type: Number, notify: true, observer: '_pageNumChanged'})
    pageNum = 1;
    @property({type: Number, notify: true})
    numPages = 0;
    @property({type: Object, notify: true, observer: '_searchChanged'})
    search = {
        query: '',
        fields: <string[]>[],
        tags: <string[]>[],
    };
    @property({type: Object, notify: true, observer: '_searchChanged'})
    searchSettings = {
        sortBy: 'name',
        sortDir: 'asc',
        viewMode: 'full',
    };
    @property({type: Array, notify: true})
    recipes: any[] = [];
    @property({type: Number, notify: true})
    totalRecipeCount = 0;

    static get observers() {
        return [
            '_updatePagination(recipes, totalRecipeCount)',
            '_searchChanged(search.*)',
            '_searchChanged(searchSettings.*)',
        ];
    }

    ready() {
        super.ready();

        this.refresh();
    }
    refresh() {
        (<IronAjaxElement>this.$.recipesAjax).params = {
            'q': this.search.query,
            'fields[]': this.search.fields,
            'tags[]': this.search.tags,
            'sort': this.searchSettings.sortBy,
            'dir': this.searchSettings.sortDir,
            'page': this.pageNum,
            'count': this._getRecipeCount(),
        };
    }

    _pageNumChanged() {
        this.refresh();
    }
    _searchChanged() {
        this.pageNum = 1;
        this.refresh();
    }
    _getRecipeCount() {
        if (this.searchSettings.viewMode === 'compact') {
            return 60;
        }
        return 18;
    }

    _handleGetRecipesRequest() {
        this.dispatchEvent(new CustomEvent('scroll-top', {bubbles: true, composed: true}));
    }
    _handleGetRecipesResponse(request: CustomEvent) {
        this.recipes = request.detail.response.recipes;
        this.totalRecipeCount = request.detail.response.total;
    }
    _handleGetRecipesError () {
        this.recipes = [];
        this.totalRecipeCount = 0;
    }

    _updatePagination(_recipes: Object|null, total: number) {
        this.numPages = Math.ceil(total / this._getRecipeCount());
    }

    _onFullViewClicked() {
        this._onChangeSearchSettings('full', this.searchSettings.sortBy, this.searchSettings.sortDir);
    }
    _onCompactViewClicked() {
        this._onChangeSearchSettings('compact', this.searchSettings.sortBy, this.searchSettings.sortDir);
    }
    _onNameSortClicked() {
        this._onChangeSearchSettings(this.searchSettings.viewMode, 'name', 'asc');
    }
    _onRatingSortClicked() {
        this._onChangeSearchSettings(this.searchSettings.viewMode, 'rating', 'desc');
    }
    _onRandomSortClicked() {
        this._onChangeSearchSettings(this.searchSettings.viewMode, 'random', 'asc');
    }
    _onAscSortClicked() {
        this._onChangeSearchSettings(this.searchSettings.viewMode, this.searchSettings.sortBy, 'asc');
    }
    _onDescSortClicked() {
        this._onChangeSearchSettings(this.searchSettings.viewMode, this.searchSettings.sortBy, 'desc');
    }
    _onChangeSearchSettings(viewMode: string, sortBy: string, sortDir: string) {
        this.set('searchSettings.viewMode', viewMode);
        this.set('searchSettings.sortBy', sortBy);
        this.set('searchSettings.sortDir', sortDir);
        (<AppDrawerElement>this.$.settingsDrawer).close();
    }

    _areEqual(a: any, b: any) {
        return a === b;
    }
    _columnize(items: any[], numSplits: number) {
        let splitCount = Math.ceil(items.length / numSplits);

        let newArrays: any[] = [
            [],
        ];
        let index = 0;

        for (let i = 0; i < items.length; i++) {
            if (i >= (index + 1) * splitCount) {
                newArrays.push([]);
                index++;
            }
            newArrays[index].push(items[i]);
        }

        return newArrays;
    }
}
