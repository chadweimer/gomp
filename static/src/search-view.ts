'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { User, RecipeCompact, DefaultSearchFilter, SearchFilter } from './models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/av-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-styles/paper-styles.js';
import '@cwmr/paper-divider/paper-divider.js';
import './components/recipe-card.js';
import './components/pagination-links.js';
import './components/recipe-rating.js';
import './components/sort-order-selector.js';
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
                }
                .section {
                    padding: 4px 8px;
                }
                .outterContainer {
                    @apply --layout-horizontal;
                    @apply --layout-wrap;
                }
                .compactContainer {
                    margin: 8px;
                }
                .pagination {
                    @apply --layout-horizontal;
                    @apply --layout-center-justified;
                }
                paper-fab.green {
                    --paper-fab-background: var(--paper-green-500);
                    --paper-fab-keyboard-focus-background: var(--paper-green-900);
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                }
                paper-icon-item {
                    cursor: pointer;
                }
                paper-menu-button {
                    padding: 0px;
                }
                paper-button {
                    color: #ffffff;
                    background: var(--light-accent-color);
                }
                .avatar {
                    width: 32px;
                    height: 32px;
                    border: 1px solid rgba(0, 0, 0, 0.25);
                    border-radius: 50%;
                }
                .compactRating {
                    --recipe-rating-size: 14px;
                }
                recipe-card {
                    width: 96%;
                    margin: 2%;
                }
                #viewModeSelector {
                    width: 100px;
                    padding-left: 3px;
                }
                @media screen and (min-width: 1200px) {
                    .controlContainer {
                        width: 33%;
                        margin-top: 0.5em;
                    }
                    .recipeContainer {
                        width: 25%;
                    }
                }
                @media screen and (min-width: 992px) and (max-width: 1199px) {
                    .controlContainer {
                        width: 33%;
                        margin-top: 0.5em;
                    }
                    .recipeContainer {
                        width: 33%;
                    }
                }
                @media screen and (min-width: 600px) and (max-width: 991px) {
                    .controlContainer {
                        @apply --layout-horizontal;
                        @apply --layout-center-justified;
                        width: 100%;
                        margin-top: 0.5em;
                    }
                    .recipeContainer {
                        width: 50%;
                    }
                }
                @media screen and (max-width: 599px) {
                    .controlContainer {
                        @apply --layout-horizontal;
                        @apply --layout-center-justified;
                        width: 100%;
                        margin-top: 0.5em;
                    }
                    .recipeContainer {
                        width: 100%;
                    }
                }
            </style>

            <div class="section">
                <div class="outterContainer">
                    <div class="controlContainer">
                        <sort-order-selector use-buttons sort-by="{{filter.sortBy}}" sort-dir="{{filter.sortDir}}"></sort-order-selector>
                        <paper-menu-button>
                            <paper-button raised="" slot="dropdown-trigger"><iron-icon icon="icons:dashboard"></iron-icon> [[searchSettings.viewMode]]</paper-button>
                            <paper-listbox slot="dropdown-content"selected="{{searchSettings.viewMode}}" attr-for-selected="name" fallback-selection="name">
                                <paper-icon-item name="full"><iron-icon icon="view-agenda" slot="item-icon"></iron-icon> Full</paper-icon-item>
                                <paper-icon-item name="compact"><iron-icon icon="view-headline" slot="item-icon"></iron-icon> Compact</paper-icon-item>
                            </paper-listbox>
                        </paper-menu-button>
                    </div>
                    <div class="controlContainer">
                        <div class="pagination">
                            <pagination-links page-num="{{pageNum}}" num-pages="[[numPages]]"></pagination-links>
                        </div>
                    </div>
                    <div class="controlContainer"></div>
                </div>
            </div>
            <div class="section">
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
                            <div class="recipeContainer compactContainer">
                                <a href="/recipes/[[item.id]]">
                                    <paper-icon-item>
                                        <img src="[[item.thumbnailUrl]]" class="avatar" slot="item-icon">
                                        <paper-item-body>
                                            <div>[[item.name]]</div>
                                            <div secondary="">
                                                <recipe-rating recipe="{{item}}" class="compactRating" readonly\$="[[!getCanEdit(currentUser)]]"></recipe-rating>
                                            </div>
                                        </paper-item-body>
                                    </paper-icon-item>
                                </a>
                            </div>
                        </template>
                    </template>
                </div>
            </div>
            <div class="section">
                <div class="pagination">
                    <pagination-links page-num="{{pageNum}}" num-pages="[[numPages]]"></pagination-links>
                </div>
            </div>
            <a href="/create" hidden\$="[[!getCanEdit(currentUser)]]"><paper-fab icon="icons:add" class="green"></paper-fab></a>

            <app-localstorage-document key="searchSettings" data="{{searchSettings}}" session-only=""></app-localstorage-document>
            <iron-ajax bubbles="" auto="" id="recipesAjax" url="/api/v1/recipes" on-response="handleGetRecipesResponse" on-error="handleGetRecipesError" debounce-duration="100"></iron-ajax>
`;
    }

    @property({type: Number, notify: true, observer: 'pageNumChanged'})
    public pageNum = 1;
    @property({type: Number, notify: true})
    public numPages = 0;
    @property({type: Object, notify: true, observer: 'searchChanged'})
    public filter: SearchFilter = new DefaultSearchFilter();
    @property({type: Object, notify: true, observer: 'searchChanged'})
    public searchSettings = {
        viewMode: 'full',
    };
    @property({type: Array, notify: true})
    public recipes: RecipeCompact[] = [];
    @property({type: Number, notify: true, observer: 'totalChanged'})
    public totalRecipeCount = 0;
    @property({type: Object, notify: true})
    public currentUser: User = null;

    private pending: {refresh: boolean; rescroll: boolean} = null;

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

    protected isActiveChanged(isActive: boolean) {
        if (!isActive) return;

        if (this.pending?.refresh === true) {
            this.refresh(this.pending.rescroll);
        }
    }

    public refresh(rescroll = false) {
        if (!this.isActive) {
            this.pending = {
                refresh: true,
                rescroll: rescroll
            };
            return;
        }

        // Make sure to fill in any missing fields
        const defaultFilter = new DefaultSearchFilter();
        const filter = {...defaultFilter, ...this.filter};

        this.recipesAjax.params = {
            'q': filter.query,
            'pictures': filter.withPictures,
            'fields[]': filter.fields,
            'tags[]': filter.tags,
            'states[]': filter.states,
            'sort': filter.sortBy,
            'dir': filter.sortDir,
            'page': this.pageNum,
            'count': this.getRecipeCount(),
        };

        if (rescroll) {
            this.dispatchEvent(new CustomEvent('scroll-top', {bubbles: true, composed: true}));
        }
    }

    protected pageNumChanged() {
        this.refresh(true);
    }
    protected searchChanged() {
        this.pageNum = 1;
        this.refresh(true);
    }
    protected totalChanged(total: number) {
        this.dispatchEvent(new CustomEvent('search-result-count-changed', {bubbles: true, composed: true, detail: total}));
    }
    protected getRecipeCount() {
        if (this.searchSettings.viewMode === 'compact') {
            return 60;
        }
        return 24;
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
}
