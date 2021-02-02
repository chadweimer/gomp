'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { GompBaseElement } from './common/gomp-base-element.js';
import { SavedSearchFilterCompact, User, UserSettings } from './models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-fab/paper-fab.js';
import './components/home-list.js';
import './shared-styles.js';

@customElement('home-view')
export class HomeView extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                }
                section {
                    padding: 8px;
                }
                header {
                    text-align: center;
                }
                img.responsive {
                    max-height: 20em;
                    max-width: 100%;
                    height: auto;
                }
                paper-fab.green {
                    --paper-fab-background: var(--paper-green-500);
                    --paper-fab-keyboard-focus-background: var(--paper-green-900);
                    position: fixed;
                    bottom: 16px;
                    right: 16px;
                }
            </style>
            <section>
                <header>
                    <h1 hidden\$="[[!currentUserSettings.homeTitle]]">[[currentUserSettings.homeTitle]]</h1>
                    <img alt="Home Image" class="responsive" hidden\$="[[!currentUserSettings.homeImageUrl]]" src="[[currentUserSettings.homeImageUrl]]">
                </header>
                <home-list is-active="[[isActive]]" readonly\$="[[!getCanEdit(currentUser)]]"></home-list>
                <template is="dom-repeat" items="[[searchFilters]]">
                    <home-list title="[[item.name]]" filter-id="[[item.id]]" is-active="[[homeListsActive]]" readonly\$="[[!getCanEdit(currentUser)]]" on-iron-ajax-presend="onAjaxPresend"></home-list>
                </template>
            </section>

            <a href="/create" hidden\$="[[!getCanEdit(currentUser)]]"><paper-fab icon="icons:add" class="green"></paper-fab></a>

            <iron-ajax bubbles="" id="userSettingsAjax" url="/api/v1/users/current/settings" on-response="handleGetUserSettingsResponse"></iron-ajax>
            <iron-ajax bubbles="" id="userFiltersAjax" url="/api/v1/users/current/filters" on-response="handleGetUserFiltersResponse"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    public currentUser: User = null;

    protected currentUserSettings: UserSettings = null;
    protected searchFilters: SavedSearchFilterCompact[] = [];
    protected homeListsActive = false;

    private get userSettingsAjax(): IronAjaxElement {
        return this.$.userSettingsAjax as IronAjaxElement;
    }
    private get userFiltersAjax(): IronAjaxElement {
        return this.$.userFiltersAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }

    protected onAjaxPresend(e: CustomEvent) {
        // WORKAROUND: Force bubble the ajax presend so that the jwt is properly filled in.
        // This is necessary due to something about dom-repeat
        this.dispatchEvent(new CustomEvent('iron-ajax-presend', {bubbles: true, composed: true, detail: e.detail}));
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
    protected handleGetUserSettingsResponse(e: CustomEvent<{response: UserSettings}>) {
        this.currentUserSettings = e.detail.response;
    }
    protected handleGetUserFiltersResponse(e: CustomEvent<{response: SavedSearchFilterCompact[]}>) {
        this.searchFilters = e.detail.response;
        this.homeListsActive = this.isActive;
    }

    protected refresh() {
        this.userSettingsAjax.generateRequest();
        this.userFiltersAjax.generateRequest();
    }
}
