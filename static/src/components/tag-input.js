import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { GestureEventListeners } from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@cwmr/paper-chip/paper-chip.js';
import '@polymer/paper-input/paper-input-container.js';
import '@cwmr/paper-tags-input/paper-tags-input.js';
import '../mixins/gomp-core-mixin.js';
import '../shared-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class TagInput extends GompCoreMixin(GestureEventListeners(PolymerElement)) {
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
                        <paper-chip on-tap="_onSuggestedTagTapped" selectable="">[[item]] <iron-icon icon="icons:add-circle"></iron-icon></paper-chip>
                    </template>
                </div>
                <input type="hidden" slot="input">
            </paper-input-container>

        <iron-ajax bubbles="" id="getSuggestedTagsAjax" url="/api/v1/tags" params="{&quot;sort&quot;: &quot;frequency&quot;, &quot;dir&quot;: &quot;desc&quot;, &quot;count&quot;: 12}" on-request="_handleGetSuggestedTagsRequest" on-response="_handleGetSuggestedTagsResponse"></iron-ajax>
`;
  }

  static get is() { return 'tag-input'; }
  static get properties() {
      return {
          tags: {
              type: Array,
              notify: true,
              value: [],
          },
      };
  }

  refresh() {
      this.$.getSuggestedTagsAjax.generateRequest();
  }

  _onSuggestedTagTapped(e) {
      e.preventDefault();

      this.$.tags.add(e.model.item);

      // Remove the tag from the suggestion list
      var suggestedTagIndex = this.suggestedTags.indexOf(e.model.item);
      if (suggestedTagIndex > -1) {
          this.splice('suggestedTags', suggestedTagIndex, 1);
      }
  }
  _handleGetSuggestedTagsRequest(e) {
      this.suggestedTags = [];
  }
  _handleGetSuggestedTagsResponse(e) {
      this.suggestedTags = e.detail.response;
  }
}

window.customElements.define(TagInput.is, TagInput);
