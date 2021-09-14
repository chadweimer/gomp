import { Checkbox } from '@material/mwc-checkbox';
import { TextField } from '@material/mwc-textfield';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { TagInput } from './tag-input.js';
import { GompBaseElement } from '../common/gomp-base-element';
import { SearchField, RecipeState, SearchPictures, DefaultSearchFilter, SearchFilter, EventWithTarget } from '../models/models';
import '@material/mwc-checkbox';
import '@material/mwc-formfield';
import '@material/mwc-textfield';
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
                .padded {
                    padding: 5px 0;
                }
                label {
                    color: var(--secondary-text-color);
                    font-size: 12px;
                }
                .note {
                    color: var(--secondary-text-color);
                    font-size: 10px;
                }
            </style>

            <section>
                <mwc-textfield class="fill" label="Search Terms" value="[[filter.query]]" on-change="queryChanged"></mwc-textfield>
            </section>
            <section>
                <tag-input id="tagsInput" tags="{{filter.tags}}"></tag-input>
            </section>
            <section class="padded">
                <label>Sort</label>
                <div class="padded">
                    <sort-order-selector sort-by="{{filter.sortBy}}" sort-dir="{{filter.sortDir}}"></sort-order-selector>
                </div>
                <li divider role="separator"></li>
            </section>
            <section class="padded">
                <label>States</label>
                <div>
                    <template is="dom-repeat" items="[[availableStates]]">
                        <mwc-formfield label="[[item.name]]">
                            <mwc-checkbox id\$="[[item.value]]" checked\$="[[isStateSelected(item.value)]]" on-change="selectedStateChanged"></mwc-checkbox>
                        <mwc-formfield>
                    </template>
                </div>
                <span class="note">Only active will be included if no selection is made</span>
                <li divider role="separator"></li>
            </section>
            <section class="padded">
                <label>Pictures</label>
                <div>
                    <template is="dom-repeat" items="[[availablePictures]]">
                        <mwc-formfield label="[[item.name]]">
                            <mwc-checkbox id\$="[[item.value]]" checked\$="[[isPictureSelected(item.value)]]" on-change="selectedPictureChanged"></mwc-checkbox>
                        <mwc-formfield>
                    </template>
                </div>
                <li divider role="separator"></li>
            </section>
            <section class="padded">
                <label>Fields to Search</label>
                <div>
                    <template is="dom-repeat" items="[[availableFields]]">
                        <mwc-formfield label="[[item.name]]">
                            <mwc-checkbox id\$="[[item.value]]" checked\$="[[isFieldSelected(item.value)]]" on-change="selectedFieldChanged"></mwc-checkbox>
                        <mwc-formfield>
                    </template>
                </div>
                <span class="note">All listed fields will be included if no selection is made</span>
                <li divider role="separator"></li>
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

    @query('#tagsInput')
    private tagsInput!: TagInput;

    @property({type: Object, notify: true})
    public filter: SearchFilter = new DefaultSearchFilter();

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

    protected queryChanged(e: EventWithTarget<TextField>) {
        this.set('filter.query', e.target.value);
    }

    protected isFieldSelected(value: SearchField) {
        return this.filter.fields.indexOf(value) >= 0;
    }
    protected fieldsChanged(selectedFields: SearchField[]|null|undefined) {
        this.availableFields.forEach(field => {
            const cb = this.shadowRoot?.querySelector('#' + field.value) as Checkbox;
            if (cb) {
                cb.checked = !!selectedFields && selectedFields.indexOf(field.value) >= 0;
            }
        });
    }
    protected selectedFieldChanged() {
        const selectedFields: SearchField[] = [];
        this.availableFields.forEach(field => {
            const cb = this.shadowRoot?.querySelector('#' + field.value) as Checkbox;
            if (cb?.checked) {
                selectedFields.push(field.value);
            }
        });
        this.set('filter.fields', selectedFields);
    }

    protected isStateSelected(value: RecipeState) {
        return this.filter.states.indexOf(value) >= 0;
    }
    protected statesChanged(selectedStates: RecipeState[]|null|undefined) {
        this.availableStates.forEach(state => {
            const cb = this.shadowRoot?.querySelector('#' + state.value) as Checkbox;
            if (cb) {
                cb.checked = !!selectedStates && selectedStates.indexOf(state.value) >= 0;
            }
        });
    }
    protected selectedStateChanged() {
        const selectedStates: RecipeState[] = [];
        this.availableStates.forEach(state => {
            const cb = this.shadowRoot?.querySelector('#' + state.value) as Checkbox;
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
            const cb = this.shadowRoot?.querySelector('#' + picture.value) as Checkbox;
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
            const cb = this.shadowRoot?.querySelector('#' + picture.value) as Checkbox;
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
