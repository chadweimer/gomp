'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { SortBy, SortDir } from '../models/models';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/av-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import './toggle-icon-button.js';
import './tag-input.js';
import '../shared-styles.js';

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
                #sortBySelection {
                    width: var(--sort-order-selector-sort-by-width, 125px);
                }
                #sortDirSelection {
                    width: var(--sort-order-selector-sort-dir-width, 75px);
                }
            </style>

            <template is="dom-if" if="[[!useButtons]]">
                <paper-dropdown-menu-light id="sortBySelection" label="Sort By" always-float-label="">
                    <paper-listbox slot="dropdown-content" selected="{{sortBy}}" attr-for-selected="name" fallback-selection="name">
                        <template is="dom-repeat" items="[[availableSortBy]]">
                            <paper-icon-item name="[[item.value]]"><iron-icon icon\$="[[item.icon]]" slot="item-icon"></iron-icon> [[item.name]]</paper-icon-item>
                        </template>
                    </paper-listbox>
                </paper-dropdown-menu-light>
                <paper-dropdown-menu-light id="sortDirSelection" always-float-label="">
                    <paper-listbox slot="dropdown-content" selected="{{sortDir}}" attr-for-selected="name" fallback-selection="asc">
                        <template is="dom-repeat" items="[[availableSortDir]]">
                            <paper-icon-item name="[[item.value]]"><iron-icon icon\$="[[item.icon]]" slot="item-icon"></iron-icon> [[item.name]]</paper-icon-item>
                        </template>
                    </paper-listbox>
                </paper-dropdown-menu-light>
            </template>

            <template is="dom-if" if="[[useButtons]]">
                <paper-menu-button>
                    <paper-button raised="" slot="dropdown-trigger"><iron-icon icon="icons:sort"></iron-icon> [[sortBy]]</paper-button>
                    <paper-listbox slot="dropdown-content" selected="{{sortBy}}" attr-for-selected="name" fallback-selection="name">
                        <template is="dom-repeat" items="[[availableSortBy]]">
                            <paper-icon-item name="[[item.value]]"><iron-icon icon\$="[[item.icon]]" slot="item-icon"></iron-icon> [[item.name]]</paper-icon-item>
                        </template>
                    </paper-listbox>
                </paper-menu-button>
                <toggle-icon-button items="[[availableSortDir]]" selected="{{sortDir}}"></toggle-icon-button>
            </template>
`;
    }

    protected availableSortBy = [
        {name: 'Name', value: SortBy.Name, icon: 'av:sort-by-alpha'},
        {name: 'Rating', value: SortBy.Rating, icon: 'icons:stars'},
        {name: 'Created', value: SortBy.Created, icon: 'av:fiber-new'},
        {name: 'Modified', value: SortBy.Modified, icon: 'icons:update'},
        {name: 'Random', value: SortBy.Random, icon: 'icons:help'}
    ];

    protected availableSortDir = [
        {name: 'Asc', value: SortDir.Asc, icon: 'icons:arrow-upward'},
        {name: 'Desc', value: SortDir.Desc, icon: 'icons:arrow-downward'},
    ];

    @property({type: Boolean, reflectToAttribute: true})
    public useButtons = false;

    @property({type: Object, notify: true})
    public sortBy: SortBy = SortBy.Name;

    @property({type: Object, notify: true})
    public sortDir: SortDir = SortDir.Asc;
}