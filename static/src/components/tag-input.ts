import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property, query } from '@polymer/decorators';
import { PaperTagsInput } from '@cwmr/paper-tags-input/paper-tags-input.js';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { UserSettings } from '../models/models.js';
import '@material/mwc-icon';
import '@cwmr/paper-chip/paper-chip.js';
import '@cwmr/paper-tags-input/paper-tags-input.js';
import '../common/shared-styles.js';

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
                mwc-icon {
                    --mdc-icon-size: 20px;
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
                label {
                    color: var(--secondary-text-color);
                    font-size: 12px;
                }
                </style>

                <paper-tags-input id="tagsInput" tags="{{tags}}"></paper-tags-input>
                <div>
                    <label>Suggested Tags</label>
                    <div>
                        <template is="dom-repeat" items="[[suggestedTags]]">
                            <paper-chip on-click="onSuggestedTagClicked" selectable><mwc-icon class="middle-vertical">add_circle</mwc-icon> [[item]]</paper-chip>
                        </template>
                    </div>
                    <li divider role="separator"></li>
                </div>
`;
    }

    @query('#tagsInput')
    private tagsInput!: PaperTagsInput;

    @property({type: Array, notify: true})
    public tags: string[] = [];

    protected suggestedTags: string[] = [];

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
        this.tagsInput.addTag(e.model.item);

        // Remove the tag from the suggestion list
        const suggestedTagIndex = this.suggestedTags.indexOf(e.model.item);
        if (suggestedTagIndex > -1) {
            this.splice('suggestedTags', suggestedTagIndex, 1);
        }
    }
}
