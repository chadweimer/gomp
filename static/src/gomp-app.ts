'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { AppDrawerElement } from '@polymer/app-layout/app-drawer/app-drawer';
import { PaperDialogElement } from '@polymer/paper-dialog';
import { PaperToastElement } from '@polymer/paper-toast/paper-toast.js';
import { SearchFilterElement } from './components/search-filter.js';
import { User, SearchFilterParameters, AppConfiguration } from './models/models.js';
import '@webcomponents/shadycss/entrypoints/apply-shim.js';
import '@polymer/app-layout/app-layout.js';
import '@polymer/app-layout/app-drawer/app-drawer';
import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/maps-icons.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-styles/default-theme.js';
import '@polymer/paper-styles/paper-styles.js';
import '@polymer/paper-toast/paper-toast.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@cwmr/paper-search/paper-search-bar.js';
import './components/search-filter.js';
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
                    --primary-color: var(--paper-deep-purple-500);
                    --accent-color: var(--paper-teal-500);
                    --light-accent-color: var(--paper-teal-300);
                    --dark-accent-color: var(--paper-teal-700);
                    @apply --paper-font-body1;
                }
                :host {
                    display: block;
                    background: var(--paper-grey-50);
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
                .indented {
                    padding-left: 150px;
                    padding-right: 150px;
                }
                @media screen and (min-width: 1200px) {
                    paper-dialog {
                        width: 33%;
                    }
                }
                @media screen and (min-width: 992px) and (max-width: 1199px) {
                    paper-dialog {
                        width: 50%;
                    }
                }
                @media screen and (min-width: 600px) and (max-width: 991px) {
                    paper-dialog {
                        width: 75%;
                    }
                }
                @media screen and (min-width: 992px) {
                    .hide-on-large-only {
                        display: none;
                    }
                }
                @media screen and (max-width: 991px) {
                    .hide-on-med-and-down {
                        display: none;
                    }
                }
                @media screen and (max-width: 599px) {
                    .hide-on-small-only {
                        display: none;
                    }
                    .indented {
                        padding-left: 15px;
                        padding-right: 15px;
                    }
                    paper-dialog {
                        width: 100%;
                    }
                    paper-search-bar {
                        --input-styles: {
                            max-width: 150px;
                        }
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
                            <iron-icon icon="maps:restaurant" slot="item-icon"></iron-icon>
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
                    <a href="/admin" tabindex="-1" hidden$="[[!getIsAdmin(currentUser)]]">
                        <paper-icon-item tabindex="-1">
                            <iron-icon icon="icons:lock" slot="item-icon"></iron-icon>
                            Admin
                        </paper-icon-item>
                    </a>
                    <paper-divider></paper-divider>
                    <a href="#!" tabindex="-1" on-click="onLogoutClicked">
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
                                <a href="/admin" hidden$="[[!getIsAdmin(currentUser)]]"><paper-item name="admin" class="hide-on-med-and-down">Admin</paper-item></a>
                                <a href="#!" on-click="onLogoutClicked"><paper-item name="logout" class="hide-on-med-and-down">Logout</paper-item></a>

                                <paper-search-bar icon="search" query="[[searchFilter.query]]" on-paper-search-search="onSearch" on-paper-search-clear="onSearch" on-paper-search-filter="onFilter"></paper-search-bar>
                            </app-toolbar>
                        </div>

                        <paper-progress indeterminate="" hidden\$="[[!loadingCount]]"></paper-progress>
                    </app-header>

                    <main>
                        <iron-pages selected="[[page]]" attr-for-selected="name" selected-attribute="is-active" fallback-selection="status-404">
                            <home-view name="home" current-user="[[currentUser]]"></home-view>
                            <search-view id="searchView" name="search" filter="[[searchFilter]]" current-user="[[currentUser]]"></search-view>
                            <recipes-view name="recipes" route="[[subroute]]" current-user="[[currentUser]]"></recipes-view>
                            <create-view name="create" current-user="[[currentUser]]"></create-view>
                            <settings-view name="settings" current-user="[[currentUser]]"></settings-view>
                            <admin-view name="admin" current-user="[[currentUser]]"></admin-view>
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
                                <li hidden$="[[!getIsAdmin(currentUser)]]"><a href="/admin">Admin</a></li>
                                <li><a href="#!" on-click="onLogoutClicked">Logout</a></li>
                            </ul>
                        </div>
                        <div class="copyright indented">Copyright © 2016-2020 Chad Weimer</div>
                    </footer>
                </app-header-layout>
            </app-drawer-layout>

            <paper-dialog id="searchFilterDialog" on-iron-overlay-opened="searchFilterDialogOpened" on-iron-overlay-closed="searchFilterDialogClosed" with-backdrop="">
                <h3>Search Settings</h3>
                <paper-dialog-scrollable>
                    <search-filter id="searchSettings"></search-filter>
                </paper-dialog-scrollable>
                <div class="buttons">
                    <paper-button on-click="onResetSearchFilterClicked">Reset</paper-button>
                    <paper-button dialog-dismiss="">Cancel</paper-button>
                    <paper-button dialog-confirm="">Apply</paper-button>
                </div>
            </paper-dialog>

            <paper-toast id="toast" class="fit-bottom"></paper-toast>

            <app-localstorage-document key="searchFilter" data="{{searchFilter}}" session-only=""></app-localstorage-document>

            <iron-ajax bubbles="" id="appConfigAjax" url="/api/v1/app/configuration" on-response="handleGetAppConfigurationResponse"></iron-ajax>
            <iron-ajax bubbles="" id="getCurrentUserAjax" url="/api/v1/users/current" on-response="handleGetCurrentUserResponse"></iron-ajax>
`;
    }

    @property({type: String, observer: 'titleChanged'})
    public title = 'GOMP: Go Meal Planner';
    @property({type: String, observer: 'pageChanged'})
    protected page = '';
    @property({type: Number})
    protected loadingCount = 0;
    @property({type: Object, notify: true})
    protected searchFilter = new SearchFilterParameters();
    @property({type: Boolean})
    protected isAuthenticated = false;
    @property({type: Object})
    protected route: {path: string}|null|undefined = null;
    @property({type: Object, observer: 'routeDataChanged'})
    protected routeData: {page: string};
    @property({type: Object, notify: true})
    protected currentUser: User = null;

    private scrollPositionMap: object = {};

    private get searchSettings(): SearchFilterElement {
        return this.$.searchSettings as SearchFilterElement;
    }
    private get searchFilterDialog(): PaperDialogElement {
        return this.$.searchFilterDialog as PaperDialogElement;
    }
    private get appConfigAjax(): IronAjaxElement {
        return this.$.appConfigAjax as IronAjaxElement;
    }
    private get toast(): PaperToastElement {
        return this.$.toast as PaperToastElement;
    }
    private get drawer(): AppDrawerElement {
        return this.$.drawer as AppDrawerElement;
    }
    private get getCurrentUserAjax(): IronAjaxElement {
        return this.$.getCurrentUserAjax as IronAjaxElement;
    }

    public ready() {
        this.addEventListener('scroll-top', () => this.setScrollPosition({x: 0, y: 0}));
        this.addEventListener('home-list-link-clicked', (e: CustomEvent) => this.onHomeLinkClicked(e));
        this.addEventListener('iron-overlay-opened', (e) => this.patchOverlay(e));
        this.addEventListener('recipes-modified', () => this.recipesModified());
        this.addEventListener('change-page', (e: CustomEvent) => this.changePageRequested(e));
        this.addEventListener('iron-ajax-presend', (e: CustomEvent) => this.onAjaxPresend(e));
        this.addEventListener('iron-ajax-request', () => this.onAjaxRequest());
        this.addEventListener('iron-ajax-response', () => this.onAjaxResponse());
        this.addEventListener('iron-ajax-error', (e: CustomEvent) => this.onAjaxError(e));
        this.addEventListener('show-toast', (e: CustomEvent) => this.onShowToast(e));
        this.addEventListener('authentication-changed', () => this.onCurrentUserChanged());
        this.addEventListener('app-config-changed', (e: CustomEvent) => this.onAppConfigChanged(e));

        super.ready();
        this.appConfigAjax.generateRequest();
        this.onCurrentUserChanged();
    }

    protected titleChanged(title: string) {
        document.title = title;
        const appName = document.querySelector('meta[name="application-name"]');
        if (appName !== null) {
            appName.setAttribute('content', title);
        }
        const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appTitle !== null) {
            appTitle.setAttribute('content', title);
        }
    }

    // https://github.com/PolymerElements/paper-dialog/issues/7
    protected patchOverlay(e: any) {
        const path = e.path || (e.composedPath && e.composedPath());
        if (path) {
            const overlay = path[0];
            if (overlay.withBackdrop) {
                overlay.parentNode.insertBefore(overlay.backdropElement, overlay);
            }
        }
    }

    protected onAjaxPresend(e: CustomEvent) {
        const jwtToken = localStorage.getItem('jwtToken');
        e.detail.options.headers = {Authorization: 'Bearer ' + jwtToken};
    }
    protected onAjaxRequest() {
        this.loadingCount++;
    }
    protected onAjaxResponse() {
        this.loadingCount--;
        if (this.loadingCount < 0) {
            this.loadingCount = 0;
        }
    }
    protected onAjaxError(e: CustomEvent) {
        this.loadingCount--;
        if (this.loadingCount < 0) {
            this.loadingCount = 0;
        }
        if ((!this.route || this.route.path !== '/login') && e.detail.request.xhr.status === 401) {
            this.logout();
        }
    }

    protected onShowToast(e: CustomEvent<{message: string}>) {
        this.toast.text = e.detail.message;
        this.toast.open();
    }

    private getScrollPosition() {
        const scrollContainer = this.getScrollContainer();
        return scrollContainer !== null
            ? {x: scrollContainer.scrollLeft, y: scrollContainer.scrollTop}
            : null;
    }
    private setScrollPosition(pos: {x: number, y: number}) {
        const scrollContainer = this.getScrollContainer();
        scrollContainer.scroll(pos.x, pos.y);
    }
    private getScrollContainer(): Element|null {
        // This is pretty brittle, as in using an interal element from the elements template,
        // but so far it's the only known way to get at the scoll position
        return this.$.mainPanel.shadowRoot.querySelector('#contentContainer');
    }
    protected routeDataChanged(routeData: {page: string}, oldRouteData: {page: string}) {
        // Close a non-persistent drawer when the page & route are changed.
        if (!this.drawer.persistent) {
            this.drawer.close();
        }

        const scrollMap = this.scrollPositionMap;

        // Store the current scroll position for when we return to this page
        const scrollPos = this.getScrollPosition();
        if (oldRouteData != null && oldRouteData.page != null) {
            scrollMap[oldRouteData.page] = scrollPos;
        }

        // IMPORTANT: These must come after storing the current scroll position
        this.page = routeData?.page || 'home';

        // IMPORTANT: This must come after changing the page, so that we scroll the new content
        if (scrollMap[routeData.page] != null) {
            this.setScrollPosition(scrollMap[routeData.page]);
        } else if (this.isConnected) {
            this.setScrollPosition({x: 0, y: 0});
        }

    }
    protected pageChanged(page: string) {
        this.verifyIsAuthenticated();

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
        case 'admin':
            import('./admin-view.js');
            break;
        case 'login':
            import('./login-view.js');
            break;
        default:
            import('./status-404-view.js');
            break;
        }
    }
    protected changePageRequested(e: CustomEvent<{url: string}>) {
        this.changeRoute(e.detail.url);
    }
    protected changeRoute(path: string) {
        this.set('route.path', path);
    }
    protected onLogoutClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.logout();
    }
    protected onCurrentUserChanged() {
        if (!this.getIsAuthenticated()) {
            this.currentUser = null;
        } else {
            this.getCurrentUserAjax.generateRequest();
        }
    }
    protected handleGetCurrentUserResponse(e: CustomEvent<{response: User}>) {
        this.currentUser = e.detail.response;
    }
    protected getIsAuthenticated() {
        const jwtToken = localStorage.getItem('jwtToken');
        return !!jwtToken;
    }
    protected verifyIsAuthenticated() {
        this.isAuthenticated = this.getIsAuthenticated();
        // Redirect to login if necessary
        if (!this.isAuthenticated) {
            if (!this.route || this.route.path !== '/login') {
                this.logout();
            }
            return false;
        }
        return true;
    }
    protected getIsAdmin(user: User) {
        if (!user?.accessLevel) {
            return false;
        }

        return user.accessLevel === 'admin';
    }
    protected logout() {
        localStorage.clear();
        sessionStorage.clear();
        this.dispatchEvent(new CustomEvent('authentication-changed', {bubbles: true, composed: true, detail: {user: null}}));
        this.changeRoute('/login');
    }
    protected onSearch(e: any) {
        this.set('searchFilter.query', e.target.query.trim());
        this.changeRoute('/search');
    }
    protected onFilter() {
        this.searchFilterDialog.open();
    }
    protected onHomeLinkClicked(e: CustomEvent<{filter: SearchFilterParameters}>) {
        this.setSearchFilter(e.detail.filter);
        this.changeRoute('/search');
    }
    protected onAppConfigChanged(e: CustomEvent<AppConfiguration>) {
        this.title = e.detail.title;
    }
    protected handleGetAppConfigurationResponse(e: CustomEvent<{response: AppConfiguration}>) {
        this.title = e.detail.response.title;
    }
    protected searchFilterDialogOpened(e: CustomEvent) {
        if (e.target !== this.searchFilterDialog) {
            return;
        }

        // Make sure to fill in any missing fields
        const defaultFilter = new SearchFilterParameters();
        const filter = {...defaultFilter, ...this.searchFilter};
        this.searchSettings.filter = JSON.parse(JSON.stringify(filter));
        this.searchSettings.refresh();
    }
    protected searchFilterDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.target !== this.searchFilterDialog) {
            return;
        }

        if (!e.detail.canceled && e.detail.confirmed) {
            this.setSearchFilter(this.searchSettings.filter);
            this.changeRoute('/search');
        }
    }
    protected onResetSearchFilterClicked() {
        this.searchSettings.filter = new SearchFilterParameters();
        this.searchSettings.refresh();
    }

    protected recipesModified() {
        // Use any, and not the real type, since we're using PRPL and don't want to import this staticly
        const searchView = this.$.searchView as any;
        if (searchView.refresh) {
            searchView.refresh();
        }
    }

    private setSearchFilter(filter: SearchFilterParameters) {
        this.set('searchFilter.query', filter.query);
        this.set('searchFilter.fields', filter.fields);
        this.set('searchFilter.tags', filter.tags);
        this.set('searchFilter.pictures', filter.pictures);
        this.set('searchFilter.states', filter.states);
        this.set('searchFilter.sortBy', filter.sortBy);
        this.set('searchFilter.sortDir', filter.sortDir);
    }
}
