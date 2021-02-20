'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperCheckboxElement } from '@polymer/paper-checkbox/paper-checkbox.js';
import { TagInput } from './tag-input.js';
import { GompBaseElement } from '../common/gomp-base-element';
import { SearchField, RecipeState, SearchPictures, DefaultSearchFilter, SearchFilter } from '../models/models';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-radio-group/paper-radio-group.js';
import '@cwmr/paper-divider/paper-divider.js';
import './sort-order-selector.js';
import './tag-input.js';

@customElement('search-filter')
export class SearchFilterElement extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                section.padded {
                    padding: 0.33em 0;
                }
                label {
                    color: var(--secondary-text-color);
                    font-size: 0.75em;
                }
                .selection {
                    padding: 0.5em;
                }
                .note {
                    color: var(--secondary-text-color);
                    font-size: 0.7em;
                }
            </style>

            <section>
                <paper-input label="Search Terms" always-float-label value="{{filter.query}}"></paper-input>
            </section>
            <section class="padded">
                <label>Fields to Search</label>
                <div>
                    <template is="dom-repeat" items="[[availableFields]]">
                        <paper-checkbox id\$="[[item.value]]" class="selection" checked\$="[[isFieldSelected(item.value)]]" on-change="selectedFieldChanged">[[item.name]]</paper-checkbox>
                    </template>
                </div>
                <span class="note">All listed fields will be included if no selection is made</span>
                <paper-divider></paper-divider>
            </section>
            <section class="padded">
                <label>States</label>
                <div>
                    <template is="dom-repeat" items="[[availableStates]]">
                        <paper-checkbox id\$="[[item.value]]" class="selection" checked\$="[[isStateSelected(item.value)]]" on-change="selectedStateChanged">[[item.name]]</paper-checkbox>
                    </template>
                </div>
                <span class="note">Only active will be included if no selection is made</span>
                <paper-divider></paper-divider>
            </section>
            <section class="padded">
                <label>Pictures</label>
                <div>
                    <template is="dom-repeat" items="[[availablePictures]]">
                        <paper-checkbox id\$="[[item.value]]" class="selection" checked\$="[[isPictureSelected(item.value)]]" on-change="selectedPictureChanged">[[item.name]]</paper-checkbox>
                    </template>
                </div>
                <paper-divider></paper-divider>
            </section>
            <section>
                <tag-input id="tagsInput" tags="{{filter.tags}}"></tag-input>
            </section>
            <section class="padded">
                <label>Sort</label>
                <div>
                    <sort-order-selector sort-by="{{filter.sortBy}}" sort-dir="{{filter.sortDir}}"></sort-order-selector>
                </div>
            </section>
`;
    }

    protected availableFields = [
        {name: 'Name', value: SearchField.Name},
        {name: 'Ingredients', value: SearchField.Ingredients},
        {name: 'Directions', value: SearchField.Directions}
    ];

    protected availableStates = [
        {name: 'Active', value: RecipeState.Active},
        {name: 'Archived', value: RecipeState.Archived}
    ];

    protected availablePictures = [
        {name: 'Yes', value: SearchPictures.Yes},
        {name: 'No', value: SearchPictures.No},
        {name: 'Any', value: SearchPictures.Any}
    ];

    @property({type: Object, notify: true})
    public filter: SearchFilter = new DefaultSearchFilter();

    private get tagsInput(): TagInput {
        return this.$.tagsInput as TagInput;
    }

    static get observers() {
        return [
            'fieldsChanged(filter.fields)',
            'statesChanged(filter.states)',
            'picturesChanged(filter.withPictures)',
        ];
    }

    public ready() {
        super.ready();

        this.fieldsChanged(this.filter.fields);
        this.statesChanged(this.filter.states);
        this.picturesChanged(this.filter.withPictures);
    }

    public refresh() {
        this.tagsInput.refresh();
    }

    protected isFieldSelected(value: SearchField) {
        return this.filter.fields.indexOf(value) >= 0;
    }
    protected fieldsChanged(selectedFields: SearchField[]) {
        this.availableFields.forEach(field => {
            const cb = this.shadowRoot.querySelector('#' + field.value) as PaperCheckboxElement;
            if (cb) {
                cb.checked = selectedFields !== null && selectedFields.indexOf(field.value) >= 0;
            }
        });
    }
    protected selectedFieldChanged() {
        const selectedFields: SearchField[] = [];
        this.availableFields.forEach(field => {
            const cb = this.shadowRoot.querySelector('#' + field.value) as PaperCheckboxElement;
            if (cb?.checked) {
                selectedFields.push(field.value);
            }
        });
        this.set('filter.fields', selectedFields);
    }

    protected isStateSelected(value: RecipeState) {
        return this.filter.states.indexOf(value) >= 0;
    }
    protected statesChanged(selectedStates: RecipeState[]) {
        this.availableStates.forEach(state => {
            const cb = this.shadowRoot.querySelector('#' + state.value) as PaperCheckboxElement;
            if (cb) {
                cb.checked = selectedStates !== null && selectedStates.indexOf(state.value) >= 0;
            }
        });
    }
    protected selectedStateChanged() {
        const selectedStates: RecipeState[] = [];
        this.availableStates.forEach(state => {
            const cb = this.shadowRoot.querySelector('#' + state.value) as PaperCheckboxElement;
            if (cb?.checked) {
                selectedStates.push(state.value);
            }
        });
        this.set('filter.states', selectedStates);
    }

    protected isPictureSelected(value: SearchPictures) {
        switch (value) {
            case SearchPictures.Yes:
                return this.filter.withPictures === true;
            case SearchPictures.No:
                return this.filter.withPictures === false;
            case SearchPictures.Any:
                return this.filter.withPictures === null;
        }
    }
    protected picturesChanged(withPictures: boolean|null) {
        this.availablePictures.forEach(picture => {
            const cb = this.shadowRoot.querySelector('#' + picture.value) as PaperCheckboxElement;
            if (cb) {
                switch (picture.value) {
                    case SearchPictures.Yes:
                        cb.checked = withPictures === true;
                        break;
                    case SearchPictures.No:
                        cb.checked = withPictures === false;
                        break;
                    case SearchPictures.Any:
                        cb.checked = withPictures === null;
                        break;
                }
            }
        });
    }
    protected selectedPictureChanged() {
        this.availablePictures.forEach(picture => {
            const cb = this.shadowRoot.querySelector('#' + picture.value) as PaperCheckboxElement;
            if (cb?.checked) {
                switch (picture.value) {
                    case SearchPictures.Yes:
                        this.set('filter.withPictures', true);
                        break;
                    case SearchPictures.No:
                        this.set('filter.withPictures', false);
                        break;
                    case SearchPictures.Any:
                        this.set('filter.withPictures', null);
                        break;
                }
            }
        });
    }
}
