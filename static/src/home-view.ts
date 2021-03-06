import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from './common/gomp-base-element.js';
import { SavedSearchFilterCompact, User, UserSettings } from './models/models.js';
import '@polymer/paper-fab/paper-fab.js';
import './common/shared-styles.js';
import './components/home-list.js';

@customElement('home-view')
export class HomeView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
            </style>
            <div class="padded-10">
                <header class="text-center">
                    <h1 hidden\$="[[!currentUserSettings.homeTitle]]">[[currentUserSettings.homeTitle]]</h1>
                    <template is="dom-if" if="[[currentUserSettings.homeImageUrl]]">
                        <img alt="Home Image" class="responsive" src="[[currentUserSettings.homeImageUrl]]">
                    </template>
                </header>
                <home-list is-active="[[isActive]]" readonly\$="[[!getCanEdit(currentUser)]]"></home-list>
                <template is="dom-repeat" items="[[searchFilters]]">
                    <home-list title="[[item.name]]" filter-id="[[item.id]]" is-active="[[homeListsActive]]" readonly\$="[[!getCanEdit(currentUser)]]" on-ajax-presend="onAjaxEvent" on-ajax-response="onAjaxEvent" on-ajax-error="onAjaxEvent"></home-list>
                </template>
                <div class="padded-10">

            <a href="/create" hidden\$="[[!getCanEdit(currentUser)]]"><paper-fab icon="icons:add" class="green"></paper-fab></a>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User|null = null;

    protected currentUserSettings: UserSettings|null = null;
    protected searchFilters: SavedSearchFilterCompact[] = [];
    protected homeListsActive = false;

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }

    protected onAjaxEvent(e: CustomEvent) {
        // WORKAROUND: Force bubble the ajax events
        // This is necessary due to something about dom-repeat
        this.dispatchEvent(new CustomEvent(e.type, {bubbles: true, composed: true, detail: e.detail}));
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive && this.isReady) {
            this.refresh();
        } else {
            // WORKAROUND: Clear everything when leaving screen so that we avoid errors
            // if one or more of the filters is deleted before returning
            this.searchFilters = [];
            this.homeListsActive = false;
        }
    }

    private async refresh() {
        try {
            this.currentUserSettings = await this.AjaxGetWithResult('/api/v1/users/current/settings');
            this.searchFilters = await this.AjaxGetWithResult('/api/v1/users/current/filters');
        } catch (e) {
            console.error(e);
        }
        this.homeListsActive = this.isActive;
    }
}
