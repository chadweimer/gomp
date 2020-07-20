'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { GompBaseElement } from './common/gomp-base-element.js';
import { HomeList } from './components/home-list.js';
import { User } from './models/models.js';
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
                  <h1 hidden\$="[[!title]]">[[title]]</h1>
                  <img alt="Home Image" class="responsive" hidden\$="[[!image]]" src="[[image]]">
              </header>
              <home-list id="allRecipes"></home-list>
              <home-list id="beefRecipes" title="Beef" tags="[&quot;beef&quot;,&quot;steak&quot;]"></home-list>
              <home-list id="poultryRecipes" title="Poultry" tags="[&quot;chicken&quot;,&quot;turkey&quot;,&quot;poultry&quot;]"></home-list>
              <home-list id="seafoodRecipes" title="Seafood" tags="[&quot;seafood&quot;,&quot;fish&quot;]"></home-list>
              <home-list id="porkRecipes" title="Pork" tags="[&quot;pork&quot;]"></home-list>
              <home-list id="pastaRecipes" title="Pasta" tags="[&quot;pasta&quot;]"></home-list>
              <home-list id="vegetarianRecipes" title="Vegetarian" tags="[&quot;vegetarian&quot;]"></home-list>
              <home-list id="sideRecipes" title="Sides" tags="[&quot;side&quot;,&quot;sides&quot;]"></home-list>
              <home-list id="drinkRecipes" title="Drinks" tags="[&quot;drink&quot;,&quot;cocktail&quot;]"></home-list>
          </section>

          <a href="/create" hidden\$="[[!getCanEdit(currentUser)]]"><paper-fab icon="icons:add" class="green"></paper-fab></a>

          <iron-ajax bubbles="" id="userSettingsAjax" url="/api/v1/users/current/settings" on-response="handleGetUserSettingsResponse"></iron-ajax>
`;
    }

    @property({type: String, notify: true})
    public title = '';
    @property({type: String, notify: true})
    public image = '';
    @property({type: Object, notify: true})
    public currentUser: User = null;

    private get lists(): HomeList[] {
        return [
            this.$.allRecipes as HomeList,
            this.$.beefRecipes as HomeList,
            this.$.poultryRecipes as HomeList,
            this.$.porkRecipes as HomeList,
            this.$.seafoodRecipes as HomeList,
            this.$.pastaRecipes as HomeList,
            this.$.vegetarianRecipes as HomeList,
            this.$.sideRecipes as HomeList,
            this.$.drinkRecipes as HomeList,
        ];
    }
    private get userSettingsAjax(): IronAjaxElement {
        return this.$.userSettingsAjax as IronAjaxElement;
    }

    public ready() {
        super.ready();

        if (this.isActive) {
            this.refresh();
        }
    }

    protected isActiveChanged(isActive: boolean) {
        if (isActive && this.isReady) {
            this.refresh();
        }
    }
    protected handleGetUserSettingsResponse(e: CustomEvent) {
        const userSettings = e.detail.response;

        this.title = userSettings.homeTitle;
        this.image = userSettings.homeImageUrl;
    }

    protected refresh() {
        this.lists.forEach((list) => {
            list.refresh();
        });
        this.userSettingsAjax.generateRequest();
    }
}
