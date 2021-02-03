'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { SavedSearchFilter, SearchFilter, SortBy, SortDir } from '../models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import './recipe-card.js';
import '../shared-styles.js';

@customElement('home-list')
export class HomeList extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                article {
                    margin-top: 1.5em;
                }
                header {
                    font-size: 1.5em;
                    margin-bottom: 0.25em;
                }
                .outerContainer {
                    @apply --layout-horizontal;
                    @apply --layout-wrap;
                }
                recipe-card {
                    --recipe-card: {
                        height: 160px;
                        width: 96%;
                        margin: 2%;
                    }
                    --recipe-card-header: {
                        height: 68%;
                    }
                    --recipe-card-content: {
                        padding: 8px;
                    }
                    --recipe-card-rating-size: 16px;
                    font-size: 0.95em;
                }
                @media screen and (min-width: 993px) {
                    .recipeContainer {
                        width: 16.6%;
                    }
                }
                @media screen and (min-width: 601px) and (max-width: 992px) {
                    .recipeContainer {
                        width: 33%;
                     }
                }
                @media screen and (max-width: 600px) {
                    .recipeContainer {
                        width: 50%;
                    }
                }
            </style>

            <article>
                <header><a href="#!" on-click="onLinkClicked">[[title]] ([[total]])</a></header>
                <div class="outerContainer">
                    <template is="dom-repeat" items="[[recipes]]">
                        <div class="recipeContainer">
                            <recipe-card recipe="[[item]]" hide-created-modified-dates readonly\$="[[readonly]]"></recipe-card>
                        </div>
                    </template>
                </div>
            </article>

            <iron-ajax bubbles="" id="getFilterAjax" url="/api/v1/users/current/filters/[[filterId]]" on-response="handleGetFilterResponse"></iron-ajax>
            <iron-ajax bubbles="" id="recipesAjax" url="/api/v1/recipes" on-request="handleGetRecipesRequest" on-response="handleGetRecipesResponse"></iron-ajax>
`;
    }

    @property({type: String, notify: true})
    public title = 'Recipes';

    @property({type: Number, notify: true, observer: 'filterIdChanged'})
    public filterId: number|null = null

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected total = 0;
    protected recipes = [];
    private filter: SearchFilter = null;

    private get getFilterAjax(): IronAjaxElement {
        return this.$.getFilterAjax as IronAjaxElement;
    }
    private get recipesAjax(): IronAjaxElement {
        return this.$.recipesAjax as IronAjaxElement;
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive && this.isReady) {
            this.filterIdChanged(this.filterId);
        }
    }

    protected filterIdChanged(newId: number|null) {
        if (newId !== null) {
            this.getFilterAjax.generateRequest();
        } else {
            this.setFilter({
                query: '',
                withPictures: null,
                fields: [],
                states: [],
                tags: [],
                sortBy: SortBy.Random,
                sortDir: SortDir.Asc
            });
        }
    }
    protected handleGetFilterResponse(e: CustomEvent<{response: SavedSearchFilter}>) {
        this.setFilter(e.detail.response);
    }
    protected handleGetRecipesRequest() {
        this.total = 0;
        this.recipes = [];
    }
    protected handleGetRecipesResponse(e: CustomEvent) {
        this.total = e.detail.response.total;
        this.recipes = e.detail.response.recipes;
    }
    protected onLinkClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.dispatchEvent(new CustomEvent('home-list-link-clicked', {bubbles: true, composed: true, detail: {filter: this.filter}}));
    }

    private setFilter(filter: SearchFilter) {
        this.filter = filter;
        this.recipesAjax.params = {
            'q': this.filter.query,
            'pictures': this.filter.withPictures,
            'fields[]': this.filter.fields,
            'tags[]': this.filter.tags,
            'states[]': this.filter.states,
            'sort': this.filter.sortBy,
            'dir': this.filter.sortDir,
            'page': 1,
            'count': 6,
        };
        this.recipesAjax.generateRequest();
    }
}
