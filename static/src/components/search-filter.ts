'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { PaperCheckboxElement } from '@polymer/paper-checkbox/paper-checkbox.js';
import { GompBaseElement } from '../common/gomp-base-element';
import { SearchFilter, SearchField, SearchState, SearchPictures } from '../models/models';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-radio-group/paper-radio-group.js';
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
                    padding: 0.5em 0;
                }
                label {
                    color: var(--secondary-text-color);
                    font-size: 0.9em;
                }
                .selection {
                    padding: 0.5em;
                }
                .note {
                    color: var(--secondary-text-color);
                    font-size: 0.75em;
                }
            </style>

            <paper-input label="Search Terms" always-float-label="" value="{{filter.query}}"></paper-input>
            <section>
                <label>Fields to Search</label>
                <div>
                    <template is="dom-repeat" items="[[availableFields]]">
                        <paper-checkbox id\$="[[item.value]]" class="selection" checked\$="[[isFieldSelected(item.value)]]" on-change="selectedFieldChanged">[[item.name]]</paper-checkbox>
                    </template>
                </div>
                <span class="note">All listed fields will be included if no selection is made</span>
                <paper-divider></paper-divider>
            </section>
            <section>
                <label>States</label>
                <div>
                    <paper-radio-group selected="{{filter.states}}">
                        <template is="dom-repeat" items="[[availableStates]]">
                            <paper-radio-button class="selection" name="[[item.value]]">[[item.name]]</paper-radio-button>
                        </template>
                    </paper-radio-group>
                </div>
                <paper-divider></paper-divider>
            </section>
            <section>
                <label>Pictures</label>
                <div>
                    <paper-radio-group selected="{{filter.pictures}}">
                        <template is="dom-repeat" items="[[availablePictures]]">
                            <paper-radio-button class="selection" name="[[item.value]]">[[item.name]]</paper-radio-button>
                        </template>
                    </paper-radio-group>
                </div>
                <paper-divider></paper-divider>
            </section>
            <paper-tags-input tags="{{filter.tags}}"></paper-tags-input>
`;
    }

    protected availableFields = [
        {name: 'Name', value: SearchField.Name},
        {name: 'Ingredients', value: SearchField.Ingredients},
        {name: 'Directions', value: SearchField.Directions}
    ];

    protected availableStates = [
        {name: 'Active', value: SearchState.Active},
        {name: 'Archived', value: SearchState.Archived},
        {name: 'Any', value: SearchState.Any}
    ];

    protected availablePictures = [
        {name: 'Yes', value: SearchPictures.Yes},
        {name: 'No', value: SearchPictures.No},
        {name: 'Any', value: SearchPictures.Any}
    ];

    @property({type: Object, notify: true})
    public filter: SearchFilter = {
        query: '',
        fields: [],
        states: SearchState.Active,
        pictures: SearchPictures.Any,
        tags: []
    };

    static get observers() {
        return [
            'fieldsChanged(filter.fields)',
        ];
    }

    public ready() {
        super.ready();

        this.fieldsChanged(this.filter.fields);
    }

    protected isFieldSelected(value: SearchField) {
        return this.filter.fields.indexOf(value) >= 0;
    }

    protected fieldsChanged(selectedFields: SearchField[]) {
        this.availableFields.forEach(field => {
            const cb = this.shadowRoot.querySelector('#' + field.value) as PaperCheckboxElement;
            if (cb) {
                cb.checked = selectedFields.indexOf(field.value) >= 0;
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
}
