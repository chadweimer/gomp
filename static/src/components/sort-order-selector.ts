'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { SortBy, SortDir } from '../models/models';
import '@material/mwc-button';
import '@material/mwc-icon';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import './toggle-icon-button.js';
import '../common/shared-styles.js';

@customElement('sort-order-selector')
export class SortOrderSelectorElement extends PolymerElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: inline-block;
                }
                paper-menu-button {
                    padding: 0px;
                }
            </style>

            <paper-menu-button>
                <mwc-button raised slot="dropdown-trigger" icon="sort" label="[[sortBy]]"></mwc-button>
                <paper-listbox slot="dropdown-content" selected="{{sortBy}}" attr-for-selected="name" fallback-selection="name">
                    <template is="dom-repeat" items="[[availableSortBy]]">
                        <paper-icon-item name="[[item.value]]"><mwc-icon slot="item-icon">[[item.icon]]</mwc-icon> [[item.name]]</paper-icon-item>
                    </template>
                </paper-listbox>
            </paper-menu-button>
            <toggle-icon-button items="[[availableSortDir]]" selected="{{sortDir}}"></toggle-icon-button>
`;
    }

    protected availableSortBy = [
        {name: 'Name', value: SortBy.Name, icon: 'sort_by_alpha'},
        {name: 'Rating', value: SortBy.Rating, icon: 'stars'},
        {name: 'Created', value: SortBy.Created, icon: 'fiber_new'},
        {name: 'Modified', value: SortBy.Modified, icon: 'update'},
        {name: 'Random', value: SortBy.Random, icon: 'help'}
    ];

    protected availableSortDir = [
        {name: 'Asc', value: SortDir.Asc, icon: 'arrow_upward'},
        {name: 'Desc', value: SortDir.Desc, icon: 'arrow_downward'},
    ];

    @property({type: Object, notify: true})
    public sortBy: SortBy = SortBy.Name;

    @property({type: Object, notify: true})
    public sortDir: SortDir = SortDir.Asc;
}
