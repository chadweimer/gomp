'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element';
import { SearchFilter, RecipeState, YesNoAny } from '../models/models';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-input/paper-input.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@cwmr/paper-tags-input/paper-tags-input.js';

@customElement('search-filter')
export class SearchFilterElement extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                section {
                    padding: 1em 0;
                }
                label {
                    color: var(--secondary-text-color);
                    font-size: 0.9em;
                }
                paper-checkbox {
                    padding: 0.5em;
                }
                .note {
                    color: var(--secondary-text-color);
                    font-size: 0.75em;
                }
            </style>

            <paper-input label="Search Terms" always-float-label="" value="{{query}}"></paper-input>
            <section>
                <label>Fields to Search</label>
                <div>
                    <paper-checkbox value="{{searchOnName}}">Name</paper-checkbox>
                    <paper-checkbox value="{{searchOnIngredients}}">Ingredients</paper-checkbox>
                    <paper-checkbox value="{{searchOnDirections}}">Directions</paper-checkbox>
                </div>
                <span class="note">All listed fields will be included if no selection is made</span>
                <paper-divider></paper-divider>
            </section>
            <section>
                <label>States</label>
                <div>
                    <paper-checkbox value="{{includeActiveState}}">Active</paper-checkbox>
                    <paper-checkbox value="{{includeArchivedState}}">Archived</paper-checkbox>
                </div>
                <span class="note">Only active recipes will be included if no selection is made</span>
                <paper-divider></paper-divider>
            </section>
            <section>
                <label>Pictures</label>
                <div>
                    <paper-checkbox value="{{includeRecipesWithPictures}}">With</paper-checkbox>
                    <paper-checkbox value="{{includeRecipesWithoutPictures}}">Without</paper-checkbox>
                </div>
                <span class="note">Both will be included if no selection is made</span>
                <paper-divider></paper-divider>
            </section>
            <paper-tags-input id="tags" tags="{{tags}}"></paper-tags-input>
`;
    }

    protected query = '';
    protected searchOnName = false;
    protected searchOnIngredients = false;
    protected searchOnDirections = false;
    protected includeActiveState = false;
    protected includeArchived = false;
    protected includeRecipesWithPictures = false;
    protected includeRecipesWithoutPictures = false;
    protected tags: string[] = [];

    @property({type: Object, notify: true})
    public filter: SearchFilter|null = {
        query: '',
        fields: [],
        states: [RecipeState.Active],
        hasPictures: YesNoAny.Any,
        tags: []
    };
}
