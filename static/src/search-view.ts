'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { AppDrawerElement } from '@polymer/app-layout/app-drawer/app-drawer.js';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/app-layout/app-drawer/app-drawer.js';
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
export class SearchView extends GompBaseElement {
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
                      <paper-icon-item name="full" on-click="onFullViewClicked"><iron-icon icon="view-agenda" slot="item-icon"></iron-icon> Full</paper-icon-item>
                      <paper-icon-item name="compact" on-click="onCompactViewClicked"><iron-icon icon="view-headline" slot="item-icon"></iron-icon> Compact</paper-icon-item>
                  </paper-listbox>
                  <paper-divider></paper-divider>
                  <label class="menu-label">Sort</label>
                  <paper-listbox class="menu-content" selected="[[searchSettings.sortBy]]" attr-for-selected="name" fallback-selection="name">
                      <paper-icon-item name="name" on-click="onNameSortClicked"><iron-icon icon="av:sort-by-alpha" slot="item-icon"></iron-icon> Name</paper-icon-item>
                      <paper-icon-item name="rating" on-click="onRatingSortClicked"><iron-icon icon="stars" slot="item-icon"></iron-icon> Rating</paper-icon-item>
                      <paper-icon-item name="name" on-click="onCreatedSortClicked"><iron-icon icon="av:fiber-new" slot="item-icon"></iron-icon> Created</paper-icon-item>
                      <paper-icon-item name="name" on-click="onModifiedSortClicked"><iron-icon icon="update" slot="item-icon"></iron-icon> Modified</paper-icon-item>
                      <paper-icon-item name="random" on-click="onRandomSortClicked"><iron-icon icon="help" slot="item-icon"></iron-icon> Random<paper-icon-item>
                  </paper-icon-item></paper-icon-item></paper-listbox>
                  <paper-divider></paper-divider>
                  <label class="menu-label">Order</label>
                  <paper-listbox class="menu-content" selected="[[searchSettings.sortDir]]" attr-for-selected="name" fallback-selection="asc">
                      <paper-icon-item name="asc" on-click="onAscSortClicked"><iron-icon icon="arrow-upward" slot="item-icon"></iron-icon> ASC</paper-icon-item>
                      <paper-icon-item name="desc" on-click="onDescSortClicked"><iron-icon icon="arrow-downward" slot="item-icon"></iron-icon> DESC</paper-icon-item>
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
                      <template is="dom-if" if="[[areEqual(searchSettings.viewMode, 'full')]]" restamp="">
                          <template is="dom-repeat" items="[[recipes]]">
                              <div class="recipeContainer">
                                  <recipe-card recipe="[[item]]"></recipe-card>
                              </div>
                          </template>
                      </template>
                      <template is="dom-if" if="[[areEqual(searchSettings.viewMode, 'compact')]]" restamp="">
                          <template is="dom-repeat" items="[[columnize(recipes, 3)]]" as="inner">
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
          <iron-ajax bubbles="" auto="" id="recipesAjax" url="/api/v1/recipes" on-request="handleGetRecipesRequest" on-response="handleGetRecipesResponse" on-error="handleGetRecipesError" debounce-duration="100"></iron-ajax>
`;
    }

    @property({type: Number, notify: true, observer: 'pageNumChanged'})
    public pageNum = 1;
    @property({type: Number, notify: true})
    public numPages = 0;
    @property({type: Object, notify: true, observer: 'searchChanged'})
    public search = {
        query: '',
        fields: [] as string[],
        tags: [] as string[],
    };
    @property({type: Object, notify: true, observer: 'searchChanged'})
    public searchSettings = {
        sortBy: 'name',
        sortDir: 'asc',
        viewMode: 'full',
    };
    @property({type: Array, notify: true})
    public recipes: any[] = [];
    @property({type: Number, notify: true})
    public totalRecipeCount = 0;

    private get settingsDrawer(): AppDrawerElement {
        return this.$.settingsDrawer as AppDrawerElement;
    }
    private get recipesAjax(): IronAjaxElement {
        return this.$.recipesAjax as IronAjaxElement;
    }

    static get observers() {
        return [
            'updatePagination(recipes, totalRecipeCount)',
            'searchChanged(search.*)',
            'searchChanged(searchSettings.*)',
        ];
    }

    public ready() {
        super.ready();

        this.refresh();
    }
    public refresh() {
        this.recipesAjax.params = {
            'q': this.search.query,
            'fields[]': this.search.fields,
            'tags[]': this.search.tags,
            'sort': this.searchSettings.sortBy,
            'dir': this.searchSettings.sortDir,
            'page': this.pageNum,
            'count': this.getRecipeCount(),
        };
    }

    protected pageNumChanged() {
        this.refresh();
    }
    protected searchChanged() {
        this.pageNum = 1;
        this.refresh();
    }
    protected getRecipeCount() {
        if (this.searchSettings.viewMode === 'compact') {
            return 60;
        }
        return 18;
    }

    protected handleGetRecipesRequest() {
        this.dispatchEvent(new CustomEvent('scroll-top', {bubbles: true, composed: true}));
    }
    protected handleGetRecipesResponse(request: CustomEvent) {
        this.recipes = request.detail.response.recipes;
        this.totalRecipeCount = request.detail.response.total;
    }
    protected handleGetRecipesError() {
        this.recipes = [];
        this.totalRecipeCount = 0;
    }

    protected updatePagination(_: object|null, total: number) {
        this.numPages = Math.ceil(total / this.getRecipeCount());
    }

    protected onFullViewClicked() {
        this.onChangeSearchSettings('full', this.searchSettings.sortBy, this.searchSettings.sortDir);
    }
    protected onCompactViewClicked() {
        this.onChangeSearchSettings('compact', this.searchSettings.sortBy, this.searchSettings.sortDir);
    }
    protected onNameSortClicked() {
        this.onChangeSearchSettings(this.searchSettings.viewMode, 'name', 'asc');
    }
    protected onRatingSortClicked() {
        this.onChangeSearchSettings(this.searchSettings.viewMode, 'rating', 'desc');
    }
    protected onCreatedSortClicked() {
        this.onChangeSearchSettings(this.searchSettings.viewMode, 'created', 'desc');
    }
    protected onModifiedSortClicked() {
        this.onChangeSearchSettings(this.searchSettings.viewMode, 'modified', 'desc');
    }
    protected onRandomSortClicked() {
        this.onChangeSearchSettings(this.searchSettings.viewMode, 'random', 'asc');
    }
    protected onAscSortClicked() {
        this.onChangeSearchSettings(this.searchSettings.viewMode, this.searchSettings.sortBy, 'asc');
    }
    protected onDescSortClicked() {
        this.onChangeSearchSettings(this.searchSettings.viewMode, this.searchSettings.sortBy, 'desc');
    }
    protected onChangeSearchSettings(viewMode: string, sortBy: string, sortDir: string) {
        this.set('searchSettings.viewMode', viewMode);
        this.set('searchSettings.sortBy', sortBy);
        this.set('searchSettings.sortDir', sortDir);
        this.settingsDrawer.close();
    }

    protected areEqual(a: any, b: any) {
        return a === b;
    }
    protected columnize(items: any[], numSplits: number) {
        const splitCount = Math.ceil(items.length / numSplits);

        const newArrays: any[] = [
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
