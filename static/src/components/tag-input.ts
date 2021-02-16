'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { PaperTagsInput } from '@cwmr/paper-tags-input/paper-tags-input.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { UserSettings } from '../models/models.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-input/paper-input-container.js';
import '@cwmr/paper-chip/paper-chip.js';
import '@cwmr/paper-tags-input/paper-tags-input.js';
import '../shared-styles.js';

@customElement('tag-input')
export class TagInput extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                :host[hidden] {
                    display: none !important;
                }
                iron-icon {
                    --iron-icon-height: 20px;
                    --iron-icon-width: 20px;
                    color: var(--paper-green-400);
                }
                paper-chip {
                    margin: 4px;
                    padding-right: 6px;
                    cursor: pointer;
                    @apply layout-horizontal;
                    background-color: var(--paper-green-100);
                }
                paper-chip[selectable]:hover {
                    color: white !important;
                    background-color: var(--paper-green-600);
                }
                </style>

                <paper-tags-input id="tags" tags="{{tags}}"></paper-tags-input>
                <paper-input-container always-float-label="true">
                    <label slot="label">Suggested Tags</label>
                    <div slot="prefix">
                        <template is="dom-repeat" items="[[suggestedTags]]">
                            <paper-chip on-click="onSuggestedTagClicked" selectable>[[item]] <iron-icon icon="icons:add-circle"></iron-icon></paper-chip>
                        </template>
                    </div>
                    <input type="hidden" slot="input">
                </paper-input-container>
`;
    }

    @property({type: Array, notify: true})
    public tags: string[] = [];

    protected suggestedTags: string[] = [];

    private get tagsElement(): PaperTagsInput {
        return this.$.tags as PaperTagsInput;
    }

    public async refresh() {
        this.suggestedTags = [];
        try {
            const userSettings: UserSettings = await this.AjaxGetWithResult('/api/v1/users/current/settings');
            if (this.tags === null || this.tags.length === 0) {
                this.suggestedTags = userSettings.favoriteTags;
            } else {
                this.suggestedTags = userSettings.favoriteTags.filter(t => this.tags.indexOf(t) === -1);
            }
        } catch (e) {
            console.error(e);
        }
    }

    protected onSuggestedTagClicked(e: {model: {item: string}}) {
        this.tagsElement.addTag(e.model.item);

        // Remove the tag from the suggestion list
        const suggestedTagIndex = this.suggestedTags.indexOf(e.model.item);
        if (suggestedTagIndex > -1) {
            this.splice('suggestedTags', suggestedTagIndex, 1);
        }
    }
}
