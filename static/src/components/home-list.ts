'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { RecipeCompact, SearchFilter, SortBy, SortDir } from '../models/models.js';
import './recipe-card.js';
import '../common/shared-styles.js';

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
                @media screen and (min-width: 992px) {
                    .recipeContainer {
                        width: 16.6%;
                    }
                }
                @media screen and (min-width: 600px) and (max-width: 991px) {
                    .recipeContainer {
                        width: 33%;
                     }
                }
                @media screen and (max-width: 599px) {
                    .recipeContainer {
                        width: 50%;
                    }
                }
            </style>

            <article>
                <header><a href="#!" on-click="onLinkClicked">[[title]] ([[total]])</a></header>
                <div class="wrap-horizontal">
                    <template is="dom-repeat" items="[[recipes]]">
                        <div class="recipeContainer">
                            <recipe-card recipe="[[item]]" hide-created-modified-dates readonly\$="[[readonly]]"></recipe-card>
                        </div>
                    </template>
                </div>
            </article>
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

    protected isActiveChanged(isActive: boolean) {
        if (isActive && this.isReady) {
            this.filterIdChanged(this.filterId);
        }
    }

    protected async filterIdChanged(newId: number|null) {
        try {
            const filter: SearchFilter = newId !== null
                ? await this.AjaxGetWithResult(`/api/v1/users/current/filters/${newId}`)
                : {
                    query: '',
                    withPictures: null,
                    fields: [],
                    states: [],
                    tags: [],
                    sortBy: SortBy.Random,
                    sortDir: SortDir.Asc
                };
            await this.setFilter(filter);
        } catch (e) {
            console.error(e);
        }
    }
    protected onLinkClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.dispatchEvent(new CustomEvent('home-list-link-clicked', {bubbles: true, composed: true, detail: {filter: this.filter}}));
    }

    private async setFilter(filter: SearchFilter) {
        this.filter = filter;
        this.total = 0;
        this.recipes = [];
        try {
            const filterQuery = {
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
            const response: {total: number, recipes: RecipeCompact[]} = await this.AjaxGetWithResult('/api/v1/recipes', filterQuery);
            this.total = response.total;
            this.recipes = response.recipes;
        } catch (e) {
            console.error(e);
        }
    }
}
