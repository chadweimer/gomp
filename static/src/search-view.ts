'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperMenuButton } from '@polymer/paper-menu-button/paper-menu-button.js';
import { GompBaseElement } from './common/gomp-base-element.js';
import { User, RecipeCompact, DefaultSearchFilter, SearchFilter, RecipeState } from './models/models.js';
import '@material/mwc-button';
import '@material/mwc-icon';
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-styles/paper-styles.js';
import './common/shared-styles.js';
import './components/recipe-card.js';
import './components/pagination-links.js';
import './components/recipe-rating.js';
import './components/sort-order-selector.js';
import './components/toggle-icon-button.js';

@customElement('search-view')
export class SearchView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;

                    margin: 10px;

                    --mdc-theme-primary: var(--accent-color);
                    --mdc-button-horizontal-padding: 4px;
                }
                .section {
                    padding: 4px 0px;
                }
                paper-menu-button {
                    padding: 0px;
                }
                .avatar {
                    width: 32px;
                    height: 32px;
                    border: 1px solid rgba(0, 0, 0, 0.25);
                    border-radius: 50%;
                }
                .listRating {
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
                    .recipeContainer {
                        width: 25%;
                    }
                }
                @media screen and (min-width: 992px) and (max-width: 1199px) {
                    .recipeContainer {
                        width: 33%;
                    }
                }
                @media screen and (min-width: 992px) {
                    .controlContainer {
                        width: 33%;
                    }
                }
                @media screen and (max-width: 991px) {
                    .controlContainer {
                        @apply --layout-horizontal;
                        @apply --layout-center-justified;
                        width: 100%;
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

            <div class="section">
                <div class="wrap-horizontal">
                    <div class="controlContainer">
                        <paper-menu-button id="statesDropdown">
                            <mwc-button raised slot="dropdown-trigger" icon="filter_list" label="[[getStateDisplay(filter.states)]]"></mwc-button>
                            <paper-listbox slot="dropdown-content" selected-values="{{filter.states}}" attr-for-selected="name" multi on-selected-values-changed="onStatesChanged">
                                <template is="dom-repeat" items="[[availableStates]]">
                                    <paper-icon-item name="[[item.value]]" on-click="searchStateClicked"><mwc-icon slot="item-icon">[[item.icon]]</mwc-icon> [[item.name]]</paper-icon-item>
                                </template>
                            </paper-listbox>
                        </paper-menu-button>
                        <sort-order-selector sort-by="{{filter.sortBy}}" sort-dir="{{filter.sortDir}}"></sort-order-selector>
                        <toggle-icon-button items="[[availableViewModes]]" selected="{{searchSettings.viewMode}}"></toggle-icon-button>
                    </div>
                    <div class="controlContainer">
                        <div class="centered-horizontal hide-on-med-and-down">
                            <pagination-links page-num="{{pageNum}}" num-pages="[[numPages]]"></pagination-links>
                        </div>
                    </div>
                </div>
            </div>
            <div class="section">
                <div class="wrap-horizontal">
                    <template is="dom-if" if="[[areEqual(searchSettings.viewMode, 'card')]]" restamp>
                        <template is="dom-repeat" items="[[recipes]]">
                            <div class="recipeContainer">
                                <recipe-card recipe="[[item]]" readonly\$="[[!getCanEdit(currentUser)]]"></recipe-card>
                            </div>
                        </template>
                    </template>
                    <template is="dom-if" if="[[areEqual(searchSettings.viewMode, 'list')]]" restamp>
                        <template is="dom-repeat" items="[[recipes]]">
                            <div class="recipeContainer">
                                <a href="/recipes/[[item.id]]/view">
                                    <paper-icon-item>
                                        <img src="[[item.thumbnailUrl]]" class="avatar" slot="item-icon">
                                        <paper-item-body>
                                            <div>[[item.name]]</div>
                                            <div secondary>
                                                <recipe-rating recipe="{{item}}" class="listRating" readonly\$="[[!getCanEdit(currentUser)]]"></recipe-rating>
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
                <div class="wrap-horizontal">
                    <div class="controlContainer"></div>
                    <div class="controlContainer">
                        <div class="centered-horizontal">
                            <pagination-links page-num="{{pageNum}}" num-pages="[[numPages]]"></pagination-links>
                        </div>
                    </div>
                </div>
            </div>
            <a href="/create" hidden\$="[[!getCanEdit(currentUser)]]"><paper-fab icon="icons:add" class="green"></paper-fab></a>

            <app-localstorage-document key="searchSettings" data="{{searchSettings}}" session-only></app-localstorage-document>
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
        viewMode: 'card',
    };
    @property({type: Array, notify: true})
    public recipes: RecipeCompact[] = [];
    @property({type: Number, notify: true, observer: 'totalChanged'})
    public totalRecipeCount = 0;
    @property({type: Object, notify: true})
    public currentUser: User = null;

    protected availableStates = [
        {name: 'Active', value: RecipeState.Active, icon: 'unarchive'},
        {name: 'Archived', value: RecipeState.Archived, icon: 'archive'},
    ];

    protected availableViewModes = [
        {name: 'Card', value: 'card', icon: 'view_agenda'},
        {name: 'List', value: 'list', icon: 'view_list'},
    ];

    private pending: {refresh: boolean; rescroll: boolean} = null;

    private get statesDropdown(): PaperMenuButton {
        return this.$.statesDropdown as PaperMenuButton;
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

        if (this.isActive) {
            this.refresh();
        }
    }

    protected isActiveChanged(isActive: boolean) {
        if (!isActive) return;

        if (this.pending?.refresh === true) {
            this.refresh(this.pending.rescroll);
        }
    }

    public async refresh(rescroll = false) {
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

        this.recipes = [];
        this.totalRecipeCount = 0;
        try {
            const filterQuery = {
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
            const response: {total: number, recipes: RecipeCompact[]} = await this.AjaxGetWithResult('/api/v1/recipes', filterQuery);
            this.recipes = response.recipes;
            this.totalRecipeCount = response.total;
        } catch (e) {
            console.error(e);
        }

        if (rescroll) {
            this.dispatchEvent(new CustomEvent('scroll-top', {bubbles: true, composed: true}));
        }
    }

    protected async pageNumChanged() {
        await this.refresh(true);
    }
    protected async searchChanged() {
        this.pageNum = 1;
        await this.refresh(true);
    }
    protected totalChanged(total: number) {
        this.dispatchEvent(new CustomEvent('search-result-count-changed', {bubbles: true, composed: true, detail: total}));
    }
    protected getRecipeCount() {
        if (this.searchSettings.viewMode === 'list') {
            return 60;
        }
        return 24;
    }

    protected updatePagination(_: object|null, total: number) {
        this.numPages = Math.ceil(total / this.getRecipeCount());
    }

    protected onStatesChanged() {
        this.notifyPath('filter.states');
    }
    protected getStateDisplay(states: RecipeState[]) {
        if (states === null || states.length == 0) {
            return RecipeState.Active;
        } else if (states.indexOf(RecipeState.Active) >= 0 && states.indexOf(RecipeState.Archived) >= 0) {
            return 'all';
        } else {
            return states[0];
        }
    }
    protected searchStateClicked() {
        this.statesDropdown.close();
    }
}
