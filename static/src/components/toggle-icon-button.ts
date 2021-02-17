'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/av-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '../common/shared-styles.js';

@customElement('toggle-icon-button')
export class ToggleIconButton extends PolymerElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: inline-block;
                }
            </style>

            <paper-button on-click="toggle" raised><iron-icon icon="[[getIcon(selected)]]"></iron-icon></paper-button>
`;
    }

    @property({type: Array})
    public items: {value: object, icon: string}[] = [];

    @property({type: Object, notify: true})
    public selected: object|null = null;

    protected toggle() {
        const len = this.items?.length || 0;
        let index = this.items.findIndex(a => a.value === this.selected);
        if (index >= (len - 1) || index < 0) {
            index = 0;
        } else {
            index++;
        }

        this.selected = this.items[index].value;
    }

    protected getIcon(selected: object) {
        return this.items.find(a => a.value === selected)?.icon;
    }
}
