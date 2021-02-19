'use strict';
import { Drawer } from '@material/mwc-drawer';
import { Snackbar } from '@material/mwc-snackbar';
import { html } from '@polymer/polymer/polymer-element.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { customElement, property } from '@polymer/decorators';
import { PaperDialogElement } from '@polymer/paper-dialog';
import { GompBaseElement } from './common/gomp-base-element.js';
import { SearchFilterElement } from './components/search-filter.js';
import { User, DefaultSearchFilter, AppConfiguration, SearchFilter } from './models/models.js';
import '@cwmr/paper-divider/paper-divider.js';
import '@cwmr/paper-search/paper-search-bar.js';
import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-drawer';
import '@material/mwc-icon';
import '@material/mwc-snackbar';
import '@material/mwc-top-app-bar';
import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '@polymer/iron-pages/iron-pages.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-styles/default-theme.js';
import '@polymer/paper-styles/paper-styles.js';
import '@webcomponents/shadycss/entrypoints/apply-shim.js';
import './common/shared-styles.js';
import './components/search-filter.js';

// Gesture events like tap and track generated from touch will not be
// preventable, allowing for better scrolling performance.
setPassiveTouchGestures(true);

@customElement('gomp-app')
export class GompApp extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    --primary-color: var(--paper-deep-purple-500);
                    --mdc-theme-primary: var(--primary-color);
                    --mdc-theme-on-primary: white;

                    --accent-color: var(--paper-teal-500);
                    --mdc-theme-secondary: var(--accent-color);

                    --light-accent-color: var(--paper-teal-300);
                    --dark-accent-color: var(--paper-teal-700);
                    --paper-tabs-selection-bar-color: var(--accent-color);

                    --paper-item: {
                        cursor: pointer;
                    }

                    display: block;
                    background: var(--paper-grey-50);
                    color: var(--primary-text-color);
                    @apply --paper-font-body1;
                    @apply --layout-fullbleed;
                }

                mwc-top-app-bar > a {
                    color: var(--mdc-theme-on-primary);
                }
                paper-search-bar {
                    color: var(--primary-text-color);
                }
                paper-search-bar[hidden] {
                    display: none !important;
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
                @media screen and (max-width: 599px) {
                    .indented {
                        padding-left: 15px;
                        padding-right: 15px;
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

            <mwc-top-app-bar>
                <mwc-icon-button icon="menu" slot="navigationIcon" on-click="onMenuClicked"></mwc-icon-button>

                <a href="/" slot="title" class="hide-on-small-only">[[title]]</a>

                <a href="/home" slot="actionItems" hidden\$="[[!isAuthenticated]]"><paper-item name="home" class="hide-on-med-and-down">Home</paper-item></a>
                <a href="/search" slot="actionItems" hidden\$="[[!isAuthenticated]]"><paper-item name="search" class="hide-on-med-and-down">Recipes</paper-item></a>
                <a href="/settings" slot="actionItems" hidden\$="[[!isAuthenticated]]"><paper-item name="settings" class="hide-on-med-and-down">Settings</paper-item></a>
                <a href="/admin" slot="actionItems" hidden\$="[[!getIsAdmin(currentUser)]]"><paper-item name="admin" class="hide-on-med-and-down">Admin</paper-item></a>
                <a href="#!" slot="actionItems" hidden\$="[[!isAuthenticated]]" on-click="onLogoutClicked"><paper-item name="logout" class="hide-on-med-and-down">Logout</paper-item></a>

                <paper-search-bar slot="actionItems" hidden\$="[[!isAuthenticated]]" icon="search" query="[[searchFilter.query]]" nr-selected-filters="[[searchResultCount]]" on-paper-search-search="onSearch" on-paper-search-clear="onSearch" on-paper-search-filter="onFilter"></paper-search-bar>

                <div>
                    <mwc-drawer id="drawer" type="modal">
                        <div>
                            <a href="/home" tabindex="-1">
                                <paper-icon-item tabindex="-1">
                                    <mwc-icon slot="item-icon">home</mwc-icon>
                                    Home
                                </paper-icon-item>
                            </a>
                            <a href="/search" tabindex="-1">
                                <paper-icon-item tabindex="-1">
                                    <mwc-icon slot="item-icon">restaurant</mwc-icon>
                                    Recipes
                                </paper-icon-item>
                            </a>
                            <paper-divider></paper-divider>
                            <a href="/settings" tabindex="-1">
                                <paper-icon-item tabindex="-1">
                                    <mwc-icon slot="item-icon">settings</mwc-icon>
                                    Settings
                                </paper-icon-item>
                            </a>
                            <a href="/admin" tabindex="-1" hidden\$="[[!getIsAdmin(currentUser)]]">
                                <paper-icon-item tabindex="-1">
                                    <mwc-icon slot="item-icon">lock</mwc-icon>
                                    Admin
                                </paper-icon-item>
                            </a>
                            <paper-divider></paper-divider>
                            <a href="#!" tabindex="-1" on-click="onLogoutClicked">
                                <paper-icon-item tabindex="-1">
                                    <mwc-icon slot="item-icon">exit_to_app</mwc-icon>
                                    Logout
                                </paper-icon-item>
                            </a>
                        </div>
                        <div slot="appContent">
                            <paper-progress indeterminate hidden\$="[[!loadingCount]]"></paper-progress>
                            <main>
                                <iron-pages selected="[[page]]" attr-for-selected="name" selected-attribute="is-active" fallback-selection="status-404">
                                    <home-view name="home" current-user="[[currentUser]]"></home-view>
                                    <search-view id="searchView" name="search" filter="{{searchFilter}}" current-user="[[currentUser]]"></search-view>
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
                                        <li hidden\$="[[!getIsAdmin(currentUser)]]"><a href="/admin">Admin</a></li>
                                        <li><a href="#!" on-click="onLogoutClicked">Logout</a></li>
                                    </ul>
                                </div>
                                <div class="copyright indented">Copyright © 2016-2020 Chad Weimer</div>
                            </footer>
                        </div>
                    </mwc-drawer>
                </div>
            </mwc-top-app-bar>

            <paper-dialog id="searchFilterDialog" on-iron-overlay-opened="searchFilterDialogOpened" on-iron-overlay-closed="searchFilterDialogClosed" with-backdrop>
                <h3>Search Settings</h3>
                <paper-dialog-scrollable>
                    <search-filter id="searchSettings"></search-filter>
                </paper-dialog-scrollable>
                <div class="buttons">
                    <mwc-button label="Reset" on-click="onResetSearchFilterClicked"></mwc-button>
                    <mwc-button label="Cancel" dialog-dismiss></mwc-button>
                    <mwc-button label="Apply" dialog-confirm></mwc-button>
                </div>
            </paper-dialog>

            <mwc-snackbar id="toast"></mwc-snackbar>

            <app-localstorage-document key="searchFilter" data="{{searchFilter}}" session-only></app-localstorage-document>
`;
    }

    @property({type: String, observer: 'titleChanged'})
    public title = 'GOMP: Go Meal Planner';
    @property({type: String, observer: 'pageChanged'})
    protected page = '';
    @property({type: Number})
    protected loadingCount = 0;
    @property({type: Object, notify: true})
    protected searchFilter: SearchFilter = new DefaultSearchFilter();
    @property({type: Boolean})
    protected isAuthenticated = false;
    @property({type: Object})
    protected route: {path: string}|null|undefined = null;
    @property({type: Object, observer: 'routeDataChanged'})
    protected routeData: {page: string};
    @property({type: Object, notify: true})
    protected currentUser: User = null;

    protected searchResultCount = 0;

    private scrollPositionMap: object = {};

    private get searchSettings(): SearchFilterElement {
        return this.$.searchSettings as SearchFilterElement;
    }
    private get searchFilterDialog(): PaperDialogElement {
        return this.$.searchFilterDialog as PaperDialogElement;
    }
    private get toast(): Snackbar {
        return this.$.toast as Snackbar;
    }
    private get drawer(): Drawer {
        return this.$.drawer as Drawer;
    }

    public ready() {
        this.addEventListener('scroll-top', () => this.setScrollPosition({x: 0, y: 0}));
        this.addEventListener('home-list-link-clicked', (e: CustomEvent) => this.onHomeLinkClicked(e));
        this.addEventListener('iron-overlay-opened', (e) => this.patchOverlay(e));
        this.addEventListener('recipes-modified', () => this.recipesModified());
        this.addEventListener('change-page', (e: CustomEvent) => this.changePageRequested(e));
        this.addEventListener('ajax-presend', (e: CustomEvent) => this.onAjaxPresend(e));
        this.addEventListener('ajax-response', () => this.onAjaxResponse());
        this.addEventListener('ajax-error', (e: CustomEvent) => this.onAjaxError(e));
        this.addEventListener('show-toast', (e: CustomEvent) => this.onShowToast(e));
        this.addEventListener('authentication-changed', () => this.onCurrentUserChanged());
        this.addEventListener('app-config-changed', (e: CustomEvent) => this.onAppConfigChanged(e));
        this.addEventListener('search-result-count-changed', (e: CustomEvent) => this.onSearchResultCountChanged(e));

        super.ready();
        this.refresh();
        this.onCurrentUserChanged();
    }

    private async refresh() {
        try {
            const appConfig: AppConfiguration = await this.AjaxGetWithResult('/api/v1/app/configuration');
            this.title = appConfig.title;
        } catch (e) {
            console.error(e);
        }
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

        this.loadingCount++;
    }
    protected onAjaxResponse() {
        if (this.loadingCount > 0) {
            this.loadingCount--;
        }
    }
    protected onAjaxError(e: CustomEvent) {
        if (this.loadingCount > 0) {
            this.loadingCount--;
        }
        if ((!this.route || this.route.path !== '/login') && e.detail.response?.status === 401) {
            this.logout();
        }
    }

    protected onShowToast(e: CustomEvent<{message: string}>) {
        this.toast.labelText = e.detail.message;
        this.toast.show();
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
        // // This is pretty brittle, as in using an interal element from the elements template,
        // // but so far it's the only known way to get at the scoll position
        // return this.drawer.shadowRoot.querySelector('.mdc-drawer-app-content');
        return document.scrollingElement;
    }
    protected routeDataChanged(routeData: {page: string}, oldRouteData: {page: string}) {
        // Close a non-persistent drawer when the page & route are changed.
        this.drawer.open = false;

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
    protected onMenuClicked() {
        this.drawer.open = true;
    }
    protected onLogoutClicked(e: Event) {
        // Don't navigate to "#!"
        e.preventDefault();

        this.logout();
    }
    protected async onCurrentUserChanged() {
        if (!this.getIsAuthenticated()) {
            this.currentUser = null;
        } else {
            try {
                this.currentUser = await this.AjaxGetWithResult('/api/v1/users/current');
            } catch (e) {
                console.error(e);
            }
        }
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
        this.dispatchEvent(new CustomEvent('authentication-changed', {bubbles: true, composed: true}));
        this.changeRoute('/login');
    }
    protected onSearch(e: any) {
        // Order is very important here for scrolling purposes
        this.changeRoute('/search');
        this.set('searchFilter.query', e.target.query.trim());
    }
    protected onFilter() {
        this.searchFilterDialog.open();
    }
    protected onHomeLinkClicked(e: CustomEvent<{filter: SearchFilter}>) {
        // Order is very important here for scrolling purposes
        this.changeRoute('/search');
        this.setSearchFilter(e.detail.filter);
    }
    protected onAppConfigChanged(e: CustomEvent<AppConfiguration>) {
        this.title = e.detail.title;
    }
    protected searchFilterDialogOpened(e: CustomEvent) {
        if (e.target !== this.searchFilterDialog) {
            return;
        }

        // Make sure to fill in any missing fields
        const defaultFilter = new DefaultSearchFilter();
        const filter = {...defaultFilter, ...this.searchFilter};
        this.searchSettings.filter = JSON.parse(JSON.stringify(filter));
        this.searchSettings.refresh();
    }
    protected searchFilterDialogClosed(e: CustomEvent<{canceled: boolean; confirmed: boolean}>) {
        if (e.target !== this.searchFilterDialog) {
            return;
        }

        if (!e.detail.canceled && e.detail.confirmed) {
            // Order is very important here for scrolling purposes
            this.changeRoute('/search');
            this.setSearchFilter(this.searchSettings.filter);
        }
    }
    protected onResetSearchFilterClicked() {
        this.searchSettings.filter = new DefaultSearchFilter();
        this.searchSettings.refresh();
    }
    protected onSearchResultCountChanged(e: CustomEvent<number>) {
        this.searchResultCount = e.detail;
    }

    protected recipesModified() {
        // Use any, and not the real type, since we're using PRPL and don't want to import this staticly
        const searchView = this.$.searchView as any;
        if (searchView.refresh) {
            searchView.refresh();
        }
    }

    private setSearchFilter(filter: SearchFilter) {
        this.searchFilter = {...filter};
    }
}
