'use strict'
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { GompCoreMixin } from '../mixins/gomp-core-mixin.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-input/paper-input-container.js';
import '@cwmr/paper-chip/paper-chip.js';
import '../shared-styles.js';

@customElement('tag-input')
export class TagInput extends GompCoreMixin(PolymerElement) {
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
                            <paper-chip on-click="_onSuggestedTagClicked" selectable="">[[item]] <iron-icon icon="icons:add-circle"></iron-icon></paper-chip>
                        </template>
                    </div>
                    <input type="hidden" slot="input">
                </paper-input-container>

            <iron-ajax bubbles="" id="getSuggestedTagsAjax" url="/api/v1/tags" params="{&quot;sort&quot;: &quot;frequency&quot;, &quot;dir&quot;: &quot;desc&quot;, &quot;count&quot;: 12}" on-request="_handleGetSuggestedTagsRequest" on-response="_handleGetSuggestedTagsResponse"></iron-ajax>
`;
    }

    @property({type: Array, notify: true})
    tags = [];

    suggestedTags: string[] = [];

    refresh() {
        let getSuggestedTagsAjax = this.$.getSuggestedTagsAjax as IronAjaxElement;
        getSuggestedTagsAjax.generateRequest();
    }

    _onSuggestedTagClicked(e: any) {
        let tagsElement = this.$.tags as any;
        tagsElement.add(e.model.item);

        // Remove the tag from the suggestion list
        var suggestedTagIndex = this.suggestedTags.indexOf(e.model.item);
        if (suggestedTagIndex > -1) {
            this.splice('suggestedTags', suggestedTagIndex, 1);
        }
    }
    _handleGetSuggestedTagsRequest() {
        this.suggestedTags = [];
    }
    _handleGetSuggestedTagsResponse(e: any) {
        this.suggestedTags = e.detail.response;
    }
}
