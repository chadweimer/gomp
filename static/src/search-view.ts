'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { AppDrawerElement } from '@polymer/app-layout/app-drawer/app-drawer.js';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { User, RecipeCompact, SearchFilter, SearchPictures, SearchState } from './models/models.js';
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
                    --recipe-rating-size: 14px;
                }
                recipe-card {
                    width: 96%;
                    margin: 2%;
                }
                @media screen and (min-width: 1200px) {
                    .recipeContainer {
                        width: 25%;
                    }
                }
                @media screen and (min-width: 992px) and (max-width: 1199px) {
                    .recipeContainer {
                        width: 33%;
                    }
                }
                @media screen and (min-width: 600px) and (max-width: 991px) {
                    .recipeContainer {
                        width: 50%;
                    }
                }
                @media screen and (max-width: 599px) {
                    .recipeContainer {
                        width: 100%;
                    }
                }
          </style>

          <app-drawer-layout force-narrow="">
              <app-drawer id="settingsDrawer" align="right" slot="drawer">
                  <!-- This is here simply to be a spacer since this shows behind the app toolbar -->
                  <app-toolbar></app-toolbar>

                  <label class="menu-label">View</label>
                  <paper-listbox selected="[[searchSettings.viewMode]]" attr-for-selected="name" fallback-selection="full">
                      <paper-icon-item name="full" on-click="onFullViewClicked"><iron-icon icon="view-agenda" slot="item-icon"></iron-icon> Full</paper-icon-item>
                      <paper-icon-item name="compact" on-click="onCompactViewClicked"><iron-icon icon="view-headline" slot="item-icon"></iron-icon> Compact</paper-icon-item>
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
                                  <recipe-card recipe="[[item]]" readonly\$="[[!getCanEdit(currentUser)]]"></recipe-card>
                              </div>
                          </template>
                      </template>
                      <template is="dom-if" if="[[areEqual(searchSettings.viewMode, 'compact')]]" restamp="">
                          <template is="dom-repeat" items="[[recipes]]">
                              <div class="recipeContainer">
                                  <a href="/recipes/[[item.id]]">
                                      <paper-icon-item>
                                          <img src="[[item.thumbnailUrl]]" class="avatar" slot="item-icon">
                                          <paper-item-body>
                                              <div>[[item.name]]</div>
                                              <div secondary="">
                                                  <recipe-rating recipe="{{item}}" class="compact-rating" readonly\$="[[!getCanEdit(currentUser)]]"></recipe-rating>
                                              </div>
                                          </paper-item-body>
                                      </paper-icon-item>
                                  </a>
                              </div>
                          </template>
                      </template>
                  </div>
                  <div class="pagination">
                      <pagination-links page-num="{{pageNum}}" num-pages="[[numPages]]"></pagination-links>
                  </div>
              </div>
              <a href="/create" hidden\$="[[!getCanEdit(currentUser)]]"><paper-fab icon="icons:add" class="green"></paper-fab></a>
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
    public filter = new SearchFilter();
    @property({type: Object, notify: true, observer: 'searchChanged'})
    public searchSettings = {
        viewMode: 'full',
    };
    @property({type: Array, notify: true})
    public recipes: RecipeCompact[] = [];
    @property({type: Number, notify: true})
    public totalRecipeCount = 0;
    @property({type: Object, notify: true})
    public currentUser: User = null;

    private get settingsDrawer(): AppDrawerElement {
        return this.$.settingsDrawer as AppDrawerElement;
    }
    private get recipesAjax(): IronAjaxElement {
        return this.$.recipesAjax as IronAjaxElement;
    }

    static get observers() {
        return [
            'updatePagination(recipes, totalRecipeCount)',
            'searchChanged(filter.*)',
            'searchChanged(searchSettings.*)',
        ];
    }

    public ready() {
        super.ready();

        this.refresh();
    }
    public refresh() {
        // Make sure to fill in any missing fields
        const defaultFilter = new SearchFilter();
        const filter = {...defaultFilter, ...this.filter};

        const pictures: string[] = [];
        switch (filter.pictures) {
            case SearchPictures.Yes:
            case SearchPictures.No:
                pictures.push(this.filter.pictures);
                break;
        }

        const states: string[] = [];
        switch (filter.states) {
            case SearchState.Active:
            case SearchState.Archived:
                states.push(this.filter.states);
                break;
            case SearchState.Any:
                states.push(SearchState.Active);
                states.push(SearchState.Archived);
                break;
        }

        this.recipesAjax.params = {
            'q': filter.query,
            'fields[]': filter.fields,
            'tags[]': filter.tags,
            'pictures[]': pictures,
            'states[]': states,
            'sort': filter.sortBy,
            'dir': filter.sortDir,
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
        return 24;
    }

    protected handleGetRecipesRequest() {
        this.dispatchEvent(new CustomEvent('scroll-top', {bubbles: true, composed: true}));
    }
    protected handleGetRecipesResponse(e: CustomEvent<{response: {recipes: RecipeCompact[], total: number}}>) {
        this.recipes = e.detail.response.recipes;
        this.totalRecipeCount = e.detail.response.total;
    }
    protected handleGetRecipesError() {
        this.recipes = [];
        this.totalRecipeCount = 0;
    }

    protected updatePagination(_: object|null, total: number) {
        this.numPages = Math.ceil(total / this.getRecipeCount());
    }

    protected onFullViewClicked() {
        this.onChangeSearchSettings('full');
    }
    protected onCompactViewClicked() {
        this.onChangeSearchSettings('compact');
    }
    protected onChangeSearchSettings(viewMode: string) {
        this.set('searchSettings.viewMode', viewMode);
        this.settingsDrawer.close();
    }
}
