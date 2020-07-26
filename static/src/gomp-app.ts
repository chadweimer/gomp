'use strict';
import { html, PolymerElement } from '@polymer/polymer/polymer-element.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { AppDrawerElement } from '@polymer/app-layout/app-drawer/app-drawer';
import { PaperToastElement } from '@polymer/paper-toast/paper-toast.js';
import { Search, User } from './models/models.js';
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
                    <paper-divider></paper-divider>
                    <a href="/search" tabindex="-1">
                        <paper-icon-item tabindex="-1">
                            <iron-icon icon="icons:view-list" slot="item-icon"></iron-icon>
                            Recipes
                        </paper-icon-item>
                    </a>
                    <a href="/archived" tabindex="-1">
                        <paper-icon-item tabindex="-1">
                            <iron-icon icon="icons:archive" slot="item-icon"></iron-icon>
                            Archived
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
                                <a href="/archived"><paper-item name="archived" class="hide-on-med-and-down">Archived</paper-item></a>
                                <a href="/settings"><paper-item name="settings" class="hide-on-med-and-down">Settings</paper-item></a>
                                <a href="/admin" hidden$="[[!getIsAdmin(currentUser)]]"><paper-item name="admin" class="hide-on-med-and-down">Admin</paper-item></a>
                                <a href="#!" on-click="onLogoutClicked"><paper-item name="logout" class="hide-on-med-and-down">Logout</paper-item></a>

                                <paper-search-bar icon="search" query="[[search.query]]" nr-selected-filters="[[selectedSearchFiltersCount]]" on-paper-search-search="onSearch" on-paper-search-clear="onSearch" on-paper-search-filter="onFilter"></paper-search-bar>
                                <paper-filter-dialog id="filterDialog" filters="[[searchFilters]]" selected-filters="{{selectedSearchFilters}}" save-button="Apply" on-save="searchFiltersChanged"></paper-filter-dialog>
                            </app-toolbar>
                        </div>

                        <paper-progress indeterminate="" hidden\$="[[!loadingCount]]"></paper-progress>
                    </app-header>

                    <main>
                        <iron-pages selected="[[page]]" attr-for-selected="name" selected-attribute="is-active" fallback-selection="status-404">
                            <home-view name="home" current-user="[[currentUser]]"></home-view>
                            <search-view id="searchView" name="search" search-type="active" search="{{search}}" current-user="[[currentUser]]"></search-view>
                            <search-view id="archivedView" name="archived" search-type="archived" search="{{search}}" current-user="[[currentUser]]"></search-view>
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
                                <li><a href="/archived">Archived</a></li>
                                <li><a href="/settings">Settings</a></li>
                                <li hidden$="[[!getIsAdmin(currentUser)]]"><a href="/admin">Admin</a></li>
                                <li><a href="#!" on-click="onLogoutClicked">Logout</a></li>
                            </ul>
                        </div>
                        <div class="copyright indented">Copyright © 2016-2020 Chad Weimer</div>
                    </footer>
                </app-header-layout>
            </app-drawer-layout>

            <paper-toast id="toast" class="fit-bottom"></paper-toast>

            <app-localstorage-document key="search" data="{{search}}" session-only=""></app-localstorage-document>

            <iron-ajax bubbles="" id="appConfigAjax" url="/api/v1/app/configuration" on-response="handleGetAppConfigurationResponse"></iron-ajax>
            <iron-ajax bubbles="" id="tagsAjax" url="/api/v1/tags" params="{&quot;sort&quot;: &quot;tag&quot;, &quot;dir&quot;: &quot;asc&quot;, &quot;count&quot;: 100000}" on-response="handleGetTagsResponse"></iron-ajax>
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
    protected search: Search = {
        query: '',
        fields: [] as string[],
        tags: [] as string[],
        pictures: [] as string[],
    };
    @property({type: Array})
    protected searchFilters: any[]|null|undefined = null;
    @property({type: Number})
    protected selectedSearchFiltersCount = 0;
    @property({type: Boolean})
    protected isAuthenticated = false;
    @property({type: Object})
    protected selectedSearchFilters: {fields?: [], tags?: [], pictures?: []} = {};
    @property({type: Object})
    protected route: {path: string}|null|undefined = null;
    @property({type: Object, notify: true})
    protected currentUser: User = null;

    private get appConfigAjax(): IronAjaxElement {
        return this.$.appConfigAjax as IronAjaxElement;
    }
    private get toast(): PaperToastElement {
        return this.$.toast as PaperToastElement;
    }
    private get drawer(): AppDrawerElement {
        return this.$.drawer as AppDrawerElement;
    }
    private get tagsAjax(): IronAjaxElement {
        return this.$.tagsAjax as IronAjaxElement;
    }
    private get getCurrentUserAjax(): IronAjaxElement {
        return this.$.getCurrentUserAjax as IronAjaxElement;
    }

    static get observers() {
        return [
            'routePageChanged(routeData.page)',
            'searchFieldsChanged(search.fields)',
            'searchTagsChanged(search.tags)',
            'searchPicturesChanged(search.pictures)',
            'searchChanged(search.fields, search.tags, search.pictures)',
        ];
    }

    public ready() {
        this.addEventListener('scroll-top', () => this.scrollToTop());
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

    protected onShowToast(e: CustomEvent) {
        this.toast.text = e.detail.message;
        this.toast.open();
    }

    protected routePageChanged(page: string|null|undefined) {
        this.page = page || 'home';

        // Close a non-persistent drawer when the page & route are changed.
        if (!this.drawer.persistent) {
            this.drawer.close();
        }
    }
    protected pageChanged(page: string) {
        if (this.verifyIsAuthenticated()) {
            this.tagsAjax.generateRequest();
        }

        // Load page import on demand. Show 404 page if fails
        switch (page) {
        case 'home':
            import('./home-view.js');
            break;
        case 'search':
            import('./search-view.js');
            break;
        case 'archived':
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
    protected changePageRequested(e: CustomEvent) {
        this.changeRoute(e.detail.url);
    }
    protected changeRoute(path: string) {
        this.set('route.path', path);
    }
    protected scrollToTop() {
        this.$.mainHeader.scroll(0, 0);
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
    protected handleGetCurrentUserResponse(e: CustomEvent) {
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
        this.set('search.query', e.target.query.trim());
        this.changeRoute('/search');
    }
    protected onFilter() {
        const filterDialog = this.$.filterDialog as any;
        filterDialog.open();
    }
    protected onHomeLinkClicked(e: CustomEvent) {
        this.set('search.query', '');
        this.set('search.fields', []);
        this.set('search.tags', e.detail.tags);
        this.set('search.pictures', []);
        this.changeRoute('/search');
    }
    protected handleGetAppConfigurationResponse(e: CustomEvent) {
        this.title = e.detail.response.title;
    }
    protected handleGetTagsResponse(e: CustomEvent) {
        const tags = e.detail.response;

        const filters: any[] = [];

        const fieldFilter = {id: 'fields', name: 'Search Fields', values: [] as any[]};
        fieldFilter.values.push({id: 'name', name: 'Name'});
        fieldFilter.values.push({id: 'ingredients', name: 'Ingredients'});
        fieldFilter.values.push({id: 'directions', name: 'Directions'});
        filters.push(fieldFilter);

        const tagFilter = {id: 'tags', name: 'Tags', values: [] as any[]};
        filters.push(tagFilter);
        if (tags) {
            tags.forEach((tag: string) => {
                tagFilter.values.push({id: tag, name: tag});
            });
        }

        const picturesFilter = {id: 'pictures', name: 'Pictures', values: [] as any[]};
        picturesFilter.values.push({id: 'yes', name: 'Yes'});
        picturesFilter.values.push({id: 'no', name: 'No'});
        filters.push(picturesFilter);

        this.searchFilters = filters;
    }
    protected searchFiltersChanged() {
        this.set('search.fields', this.selectedSearchFilters.fields || []);
        this.set('search.tags', this.selectedSearchFilters.tags || []);
        this.set('search.pictures', this.selectedSearchFilters.pictures || []);
        this.changeRoute('/search');
    }
    protected searchChanged(fields: string[], tags: string[], pictures: string[]) {
        this.selectedSearchFiltersCount = fields.length + tags.length + pictures.length;
    }
    protected searchFieldsChanged(fields: string[]) {
        if (!this.selectedSearchFilters) {
            this.selectedSearchFilters = {};
        }
        this.set('selectedSearchFilters.fields', fields);
    }
    protected searchTagsChanged(tags: string[]) {
        if (!this.selectedSearchFilters) {
            this.selectedSearchFilters = {};
        }
        this.set('selectedSearchFilters.tags', tags);
    }
    protected searchPicturesChanged(pictures: string[]) {
        if (!this.selectedSearchFilters) {
            this.selectedSearchFilters = {};
        }
        this.set('selectedSearchFilters.pictures', pictures);
    }

    protected recipesModified() {
        // Use any, and not the real type, since we're using PRPL and don't want to import this staticly
        const searchView = this.$.searchView as any;
        if (searchView.refresh) {
            searchView.refresh();
        }
        const archivedView = this.$.archivedView as any;
        if (archivedView.refresh) {
            archivedView.refresh();
        }
    }
}
