'use strict';
import { Dialog } from '@material/mwc-dialog';
import { Drawer } from '@material/mwc-drawer';
import { Snackbar } from '@material/mwc-snackbar';
import { TopAppBar } from '@material/mwc-top-app-bar';
import { html } from '@polymer/polymer/polymer-element.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { customElement, property } from '@polymer/decorators';
import { GompBaseElement } from './common/gomp-base-element.js';
import { SearchFilterElement } from './components/search-filter.js';
import { User, DefaultSearchFilter, AppConfiguration, SearchFilter } from './models/models.js';
import '@cwmr/paper-search/paper-search-bar.js';
import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-dialog';
import '@material/mwc-drawer';
import '@material/mwc-icon';
import '@material/mwc-linear-progress';
import '@material/mwc-list/mwc-list';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-snackbar';
import '@material/mwc-top-app-bar';
import '@polymer/app-route/app-location.js';
import '@polymer/app-route/app-route.js';
import '@polymer/app-storage/app-localstorage/app-localstorage-document.js';
import '@polymer/iron-pages/iron-pages.js';
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

                    display: block;
                    background: var(--paper-grey-50);
                    color: var(--primary-text-color);
                    @apply --paper-font-body1;
                    @apply --layout-fullbleed;
                }

                mwc-linear-progress {
                    --mdc-theme-primary: var(--accent-color);
                }
                mwc-top-app-bar > a {
                    --mdc-theme-text-primary-on-background: var(--mdc-theme-on-primary);
                    color: var(--mdc-theme-on-primary);
                }
                paper-search-bar {
                    color: var(--primary-text-color);
                }
                paper-search-bar[hidden] {
                    display: none !important;
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
                #mainContent {
                    display: flex;
                    height: 100%;
                    flex-flow: column;
                    overflow: auto;
                }
                #appBar {
                    flex: 1 1 auto;
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

            <mwc-drawer id="drawer" type="modal">
                <mwc-list activatable>
                    <a href="/home" tabindex="-1">
                        <mwc-list-item graphic="icon" activated\$="[[areEqual(page, 'home')]]">
                            <mwc-icon slot="graphic">home</mwc-icon>
                            Home
                        </mwc-list-item>
                    </a>
                    <a href="/search" tabindex="-1">
                        <mwc-list-item graphic="icon" activated\$="[[isIn(page, 'search', 'recipes', 'create')]]">
                            <mwc-icon slot="graphic">restaurant</mwc-icon>
                            Recipes
                        </mwc-list-item>
                    </a>
                    <li divider role="separator"></li>
                    <a href="/settings" tabindex="-1">
                        <mwc-list-item graphic="icon" activated\$="[[areEqual(page, 'settings')]]">
                            <mwc-icon slot="graphic">settings</mwc-icon>
                            Settings
                        </mwc-list-item>
                    </a>
                    <a href="/admin" tabindex="-1" hidden\$="[[!getIsAdmin(currentUser)]]">
                        <mwc-list-item graphic="icon" activated\$="[[areEqual(page, 'admin')]]">
                            <mwc-icon slot="graphic">lock</mwc-icon>
                            Admin
                        </mwc-list-item>
                    </a>
                    <li divider role="separator"></li>
                    <a href="#!" tabindex="-1" on-click="onLogoutClicked">
                        <mwc-list-item graphic="icon">
                            <mwc-icon slot="graphic">exit_to_app</mwc-icon>
                            Logout
                        </mwc-list-item>
                    </a>
                </mwc-list>
                <div id="mainContent" slot="appContent">
                    <mwc-top-app-bar id="appBar">
                        <mwc-icon-button icon="menu" slot="navigationIcon" class="hide-on-large-only" on-click="onMenuClicked"></mwc-icon-button>

                        <a href="/" slot="title" class="hide-on-small-only">[[title]]</a>

                        <a href="/home" slot="actionItems" hidden\$="[[!isAuthenticated]]"><mwc-list-item class="hide-on-med-and-down">Home</mwc-list-item></a>
                        <a href="/search" slot="actionItems" hidden\$="[[!isAuthenticated]]"><mwc-list-item class="hide-on-med-and-down">Recipes</mwc-list-item></a>
                        <a href="/settings" slot="actionItems" hidden\$="[[!isAuthenticated]]"><mwc-list-item class="hide-on-med-and-down">Settings</mwc-list-item></a>
                        <a href="/admin" slot="actionItems" hidden\$="[[!getIsAdmin(currentUser)]]"><mwc-list-item class="hide-on-med-and-down">Admin</mwc-list-item></a>

                        <a href="#!" slot="actionItems" hidden\$="[[!isAuthenticated]]" on-click="onLogoutClicked"><mwc-list-item class="hide-on-med-and-down">Logout</mwc-list-item></a>

                        <paper-search-bar slot="actionItems" hidden\$="[[!isAuthenticated]]" icon="search" query="[[searchFilter.query]]" nr-selected-filters="[[searchResultCount]]" always-show-clear on-paper-search-search="onSearch" on-paper-search-clear="onClearSearch" on-paper-search-filter="onFilter"></paper-search-bar>

                        <mwc-linear-progress indeterminate closed\$="[[!loadingCount]]"></mwc-linear-progress>
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
                    </mwc-top-app-bar>

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
                        <div class="copyright indented">Copyright © 2016-2021 Chad Weimer</div>
                    </footer>
                </div>
            </mwc-drawer>

            <mwc-dialog id="searchFilterDialog" heading="Search Settings" on-opened="searchFilterDialogOpened" on-closed="searchFilterDialogClosed">
                <search-filter id="searchSettings"></search-filter>
                <mwc-button slot="primaryAction" label="Apply" dialogAction="apply"></mwc-button>
                <span slot="secondaryAction">
                    <mwc-button label="Reset" on-click="onResetSearchFilterClicked"></mwc-button>
                    <mwc-button label="Cancel" dialogAction="cancel"></mwc-button>
                </span>
            </mwc-dialog>

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
    private get searchFilterDialog(): Dialog {
        return this.$.searchFilterDialog as Dialog;
    }
    private get toast(): Snackbar {
        return this.$.toast as Snackbar;
    }
    private get drawer(): Drawer {
        return this.$.drawer as Drawer;
    }
    private get appBar(): TopAppBar {
        return this.$.appBar as TopAppBar;
    }
    private get mainContent(): HTMLElement {
        return this.$.mainContent as HTMLElement;
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

        // Need to explicitly set this to get the correct behavior
        // since the app bar is not the root elemenet
        const scrollContainer = this.getScrollContainer();
        if (scrollContainer !== null) {
            this.appBar.scrollTarget = scrollContainer;
        }

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
        scrollContainer?.scroll(pos.x, pos.y);
    }
    private getScrollContainer(): HTMLElement|null {
        return this.mainContent;
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
        this.drawer.open = !this.drawer.open;
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
    protected onClearSearch() {
        // Order is very important here for scrolling purposes
        this.changeRoute('/search');
        this.setSearchFilter(new DefaultSearchFilter());
    }
    protected onSearch(e: any) {
        // Order is very important here for scrolling purposes
        this.changeRoute('/search');
        this.set('searchFilter.query', e.target.query.trim());
    }
    protected onFilter() {
        this.searchFilterDialog.show();
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
    protected searchFilterDialogClosed(e: CustomEvent<{action: string}>) {
        if (e.target !== this.searchFilterDialog) {
            return;
        }

        if (e.detail.action === 'apply') {
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
