'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { AppDrawerElement } from '@polymer/app-layout/app-drawer/app-drawer';
import { PaperToastElement } from '@polymer/paper-toast/paper-toast.js';
import '@webcomponents/shadycss/entrypoints/apply-shim.js';
import '@polymer/app-layout/app-layout.js';
import '@polymer/app-layout/app-drawer/app-drawer';
import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-styles/default-theme.js';
import '@polymer/paper-styles/paper-styles.js';
import '@polymer/paper-toast/paper-toast.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@cwmr/paper-search/paper-search-bar.js';
import '@cwmr/paper-search/paper-filter-dialog.js';
import './shared-styles.js';

// Gesture events like tap and track generated from touch will not be
// preventable, allowing for better scrolling performance.
setPassiveTouchGestures(true);

@customElement('gomp-app')
export class GompApp extends PolymerElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host > * {
                    --primary-color: var(--paper-blue-500);
                    --accent-color: var(--paper-red-500);
                    --light-accent-color: var(--paper-red-300);
                    --dark-accent-color: var(--paper-red-700);
                    @apply --paper-font-body1;
                }
                :host {
                    display: block;
                    @apply --layout-fullbleed;
                }
                iron-pages > :not(.iron-selected) {
                    pointer-events: none;
                }

                app-toolbar {
                    background: var(--primary-color);
                    color: white;
                }
                app-toolbar a {
                    color: white;
                }
                paper-search-bar {
                    color: var(--light-theme-text-color);
                }
                paper-filter-dialog {
                    --paper-filter-toolbar-background: var(--primary-color);
                    --paper-filter-toolbar: {
                        background: var(--primary-color);
                        color: white;
                    }
                }
                paper-progress {
                    width: 100%;
                }
                main {
                    @apply --layout-flex;
                }
                footer {
                    color: white;
                    background: var(--paper-grey-500);
                    line-height: 24px;
                }
                footer a {
                    color: white;
                }
                footer .copyright {
                    background: var(--paper-grey-600);
                    padding-top: 10px;
                    padding-bottom: 10px;
                    font-weight: lighter;
                    font-size: 0.9em;
                }
                @media screen and (min-width: 993px) {
                    .hide-on-large-only {
                        display: none;
                    }
                }
                @media screen and (max-width: 992px) {
                    .hide-on-med-and-down {
                        display: none;
                    }
                }
                @media screen and (min-width: 601px) {
                    .indented {
                        padding-left: 150px;
                        padding-right: 150px;
                    }
                }
                @media screen and (max-width: 600px) {
                    .hide-on-small-only {
                        display: none;
                    }
                    .indented {
                        padding-left: 15px;
                        padding-right: 15px;
                    }
                }
            </style>

            <app-location route="{{route}}"></app-location>
            <app-route route="{{route}}" pattern="/:page" data="{{routeData}}" tail="{{subroute}}"></app-route>

            <app-drawer-layout force-narrow="" fullbleed="">
                <app-drawer id="drawer" slot="drawer" swipe-open="">
                    <app-toolbar>[[title]]</app-toolbar>
                    <a href="/home" tabindex="-1">
                        <paper-icon-item tabindex="-1">
                            <iron-icon icon="icons:home" slot="item-icon"></iron-icon>
                            Home
                        </paper-icon-item>
                    </a>
                    <a href="/search" tabindex="-1">
                        <paper-icon-item tabindex="-1">
                            <iron-icon icon="icons:view-list" slot="item-icon"></iron-icon>
                            Recipes
                        </paper-icon-item>
                    </a>
                    <paper-divider></paper-divider>
                    <a href="/settings" tabindex="-1">
                        <paper-icon-item tabindex="-1">
                            <iron-icon icon="icons:settings" slot="item-icon"></iron-icon>
                            Settings
                        </paper-icon-item>
                    </a>
                    <a href="#!" tabindex="-1" on-click="_onLogoutClicked">
                        <paper-icon-item tabindex="-1">
                            <iron-icon icon="icons:exit-to-app" slot="item-icon"></iron-icon>
                            Logout
                        </paper-icon-item>
                    </a>
                </app-drawer>
                <app-header-layout id="mainPanel" fullbleed="" has-scrolling-region="">
                    <app-header id="mainHeader" slot="header" reveals="" shadow="">
                        <div hidden\$="[[isAuthenticated]]">
                            <app-toolbar>
                                <div main-title="">[[title]]</div>
                            </app-toolbar>
                        </div>
                        <div hidden\$="[[!isAuthenticated]]">
                            <app-toolbar>
                                <paper-icon-button class="menu-button hide-on-large-only" icon="menu" drawer-toggle=""></paper-icon-button>
                                <a href="/" class="hide-on-small-only">[[title]]</a>
                                <div main-title=""></div>
                                <a href="/home"><paper-item name="home" class="hide-on-med-and-down">Home</paper-item></a>
                                <a href="/search"><paper-item name="search" class="hide-on-med-and-down">Recipes</paper-item></a>
                                <a href="/settings"><paper-item name="settings" class="hide-on-med-and-down">Settings</paper-item></a>
                                <a href="#!" on-click="_onLogoutClicked"><paper-item name="logout" class="hide-on-med-and-down">Logout</paper-item></a>

                                <paper-search-bar icon="search" query="[[search.query]]" nr-selected-filters="[[selectedSearchFiltersCount]]" on-paper-search-search="_onSearch" on-paper-search-clear="_onSearch" on-paper-search-filter="_onFilter"></paper-search-bar>
                                <paper-filter-dialog id="filterDialog" filters="[[searchFilters]]" selected-filters="{{selectedSearchFilters}}" save-button="Apply" on-save="_searchFiltersChanged"></paper-filter-dialog>
                            </app-toolbar>
                        </div>

                        <paper-progress indeterminate="" hidden\$="[[!loadingCount]]"></paper-progress>
                    </app-header>

                    <main>
                        <iron-pages selected="[[page]]" attr-for-selected="name" selected-attribute="is-active" fallback-selection="status-404">
                            <home-view name="home"></home-view>
                            <search-view id="searchView" name="search" search="{{search}}"></search-view>
                            <recipes-view name="recipes" route="[[subroute]]"></recipes-view>
                            <create-view name="create"></create-view>
                            <settings-view name="settings"></settings-view>
                            <login-view name="login"></login-view>
                            <status-404-view name="status-404"></status-404-view>
                        </iron-pages>
                    </main>

                    <footer>
                        <div class="indented" hidden\$="[[!isAuthenticated]]">
                            <h4>Links</h4>
                            <ul>
                                <li><a href="/home">Home</a></li>
                                <li><a href="/search">Recipes</a></li>
                                <li><a href="/settings">Settings</a></li>
                                <li><a href="#!" on-click="_onLogoutClicked">Logout</a></li>
                            </ul>
                        </div>
                        <div class="copyright indented">Copyright © 2016-2019 Chad Weimer</div>
                    </footer>
                </app-header-layout>
            </app-drawer-layout>

            <paper-toast id="toast" class="fit-bottom"></paper-toast>

            <app-localstorage-document key="search" data="{{search}}" session-only=""></app-localstorage-document>

            <iron-ajax bubbles="" id="appConfigAjax" url="/api/v1/app/configuration" on-response="_handleGetAppConfigurationResponse"></iron-ajax>
            <iron-ajax bubbles="" id="tagsAjax" url="/api/v1/tags" params="{&quot;sort&quot;: &quot;tag&quot;, &quot;dir&quot;: &quot;asc&quot;, &quot;count&quot;: 100000}" on-response="_handleGetTagsResponse"></iron-ajax>
`;
    }

    @property({type: String, observer: '_titleChanged'})
    title = 'GOMP: Go Meal Planner';
    @property({type: String, observer: '_pageChanged'})
    page = '';
    @property({type: Number})
    loadingCount = 0;
    @property({type: Object, notify: true})
    search = {
        query: '',
        fields: <string[]>[],
        tags: <string[]>[],
    };
    @property({type: Array})
    searchFilters: any[]|null|undefined = null;
    @property({type: Number})
    selectedSearchFiltersCount = 0;
    @property({type: Boolean})
    isAuthenticated = false;
    @property({type: Array})
    selectedSearchFilters = <any>[];
    @property({type: Object})
    route: {path: string}|null|undefined = null;

    static get observers() {
        return [
            '_routePageChanged(routeData.page)',
            '_searchFieldsChanged(search.fields)',
            '_searchTagsChanged(search.tags)',
        ];
    }

    ready() {
        this.addEventListener('scroll-top', () => this._scrollToTop());
        this.addEventListener('home-list-link-clicked', e => this._onHomeLinkClicked(<CustomEvent>e));
        this.addEventListener('iron-overlay-opened', e => this._patchOverlay(e));
        this.addEventListener('recipes-modified', () => this._recipesModified());
        this.addEventListener('change-page', e => this._changePageRequested(<CustomEvent>e));
        this.addEventListener('iron-ajax-presend', e => this._onAjaxPresend(<CustomEvent>e));
        this.addEventListener('iron-ajax-request', () => this._onAjaxRequest());
        this.addEventListener('iron-ajax-response', () => this._onAjaxResponse());
        this.addEventListener('iron-ajax-error', e => this._onAjaxError(<CustomEvent>e));
        this.addEventListener('show-toast', e => this._onShowToast(<CustomEvent>e));

        super.ready();
        (<IronAjaxElement>this.$.appConfigAjax).generateRequest();
    }

    _titleChanged(title: string) {
        document.title = title;
        let appName = document.querySelector('meta[name="application-name"]');
        if (appName !== null) {
            appName.setAttribute('content', title);
        }
        let appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appTitle !== null) {
            appTitle.setAttribute('content', title);
        }
    }

    // https://github.com/PolymerElements/paper-dialog/issues/7
    _patchOverlay(e: any) {
        var path = e.path || (e.composedPath && e.composedPath());
        if (path) {
            var overlay = path[0];
            if (overlay.withBackdrop) {
                overlay.parentNode.insertBefore(overlay.backdropElement, overlay);
            }
        }
    }

    _onAjaxPresend(e: CustomEvent) {
        var jwtToken = localStorage.getItem('jwtToken');
        e.detail.options.headers = {'Authorization': 'Bearer ' + jwtToken};
    }
    _onAjaxRequest() {
        this.loadingCount++;
    }
    _onAjaxResponse() {
        this.loadingCount--;
        if (this.loadingCount < 0) {
            this.loadingCount = 0;
        }
    }
    _onAjaxError(e: CustomEvent) {
        this.loadingCount--;
        if (this.loadingCount < 0) {
            this.loadingCount = 0;
        }
        if ((!this.route || this.route.path !== '/login') && e.detail.request.xhr.status === 401) {
            this._logout();
        }
    }

    _onShowToast(e: CustomEvent) {
        let toast = this.$.toast as PaperToastElement;
        toast.text = e.detail.message;
        toast.open();
    }

    _routePageChanged(page: string|null|undefined) {
        this.page = page || 'home';

        // Close a non-persistent drawer when the page & route are changed.
        let drawer = this.$.drawer as AppDrawerElement;
        if (!drawer.persistent) {
            drawer.close();
        }
    }
    _pageChanged(page: string) {
        if (this._verifyIsAuthenticated()) {
            (<IronAjaxElement>this.$.tagsAjax).generateRequest();
        }

        // Load page import on demand. Show 404 page if fails
        switch (page) {
        case 'home':
            import('./home-view.js');
            break;
        case 'search':
            import('./search-view.js');
            break;
        case 'recipes':
            import('./recipes-view.js');
            break;
        case 'create':
            import('./create-view.js');
            break;
        case 'settings':
            import('./settings-view.js');
            break;
        case 'login':
            import('./login-view.js');
            break;
        default:
            import('./status-404-view.js');
            break;
        }
    }
    _changePageRequested(e: CustomEvent) {
        this._changeRoute(e.detail.url);
    }
    _changeRoute(path: string) {
        this.set('route.path', path);
    }
    _scrollToTop() {
        this.$.mainHeader.scroll(0, 0);
    }
    _onLogoutClicked(e: Event) {
        // Don't nativate to "#!"
        e.preventDefault();

        this._logout();
    }
    _getIsAuthenticated() {
        var jwtToken = localStorage.getItem('jwtToken');
        return jwtToken !== null;
    }
    _verifyIsAuthenticated() {
        this.isAuthenticated = this._getIsAuthenticated();
        // Redirect to login if necessary
        if (!this.isAuthenticated) {
            if (!this.route || this.route.path !== '/login') {
                this._logout();
            }
            return false;
        }
        return true;
    }
    _logout() {
        localStorage.clear();
        sessionStorage.clear();
        this._changeRoute('/login');
    }
    _onSearch(e: any) {
        this.set('search.query', e.target.query.trim());
        this._changeRoute('/search');
    }
    _onFilter() {
        (<any>this.$.filterDialog).open();
    }
    _onHomeLinkClicked(e: CustomEvent) {
        this.set('search.query', '');
        this.set('search.fields', []);
        this.set('search.tags', e.detail.tags);
        this._changeRoute('/search');
    }
    _handleGetAppConfigurationResponse(e: CustomEvent) {
        this.title = e.detail.response.title;
    }
    _handleGetTagsResponse(e: CustomEvent) {
        let tags = e.detail.response;

        let filters = <any>[];

        let fieldFilter = {id: 'fields', name: 'Search Fields', values: <any>[]};
        fieldFilter.values.push({id: 'name', name: 'Name'});
        fieldFilter.values.push({id: 'ingredients', name: 'Ingredients'});
        fieldFilter.values.push({id: 'directions', name: 'Directions'});
        filters.push(fieldFilter);

        let tagFilter = {id: 'tags', name: 'Tags', values: <any>[]};
        filters.push(tagFilter);
        if (tags) {
            tags.forEach(function(tag: string) {
                tagFilter.values.push({id: tag, name: tag});
            });
        }

        this.searchFilters = filters;
    }
    _searchFiltersChanged() {
        if (this.selectedSearchFilters.fields) {
            this.set('search.fields', this.selectedSearchFilters.fields);
        } else {
            this.set('search.fields', []);
        }
        if (this.selectedSearchFilters.tags) {
            this.set('search.tags', this.selectedSearchFilters.tags);
        } else {
            this.set('search.tags', []);
        }
        this._changeRoute('/search');
    }
    _searchFieldsChanged(fields: string[]) {
        if (!this.selectedSearchFilters) {
            this.selectedSearchFilters = {};
        }
        this.set('selectedSearchFilters.fields', fields);
    }
    _searchTagsChanged(tags: string[]) {
        if (!this.selectedSearchFilters) {
            this.selectedSearchFilters = {};
        }
        this.set('selectedSearchFilters.tags', tags);
        // Only use tags for the number of selected filters
        this.selectedSearchFiltersCount = tags.length;
    }

    _recipesModified() {
        // Use any, and not the real type, since we're using PRPL and don't want to import this staticly
        let searchView = <any>this.$.searchView;
        if (searchView.refresh) {
            searchView.refresh();
        }
    }
}
