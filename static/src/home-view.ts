'use strict'
import { html } from '@polymer/polymer/polymer-element.js';
import { customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax';
import { GompBaseElement } from './common/gomp-base-element.js';
import { HomeList } from './components/home-list.js';
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

          <a href="/create"><paper-fab icon="icons:add" class="green"></paper-fab></a>

          <iron-ajax bubbles="" id="userSettingsAjax" url="/api/v1/users/current/settings" on-response="_handleGetUserSettingsResponse"></iron-ajax>
`;
    }

    @property({type: String, notify: true})
    title = '';
    @property({type: String, notify: true})
    image = '';

    ready() {
        super.ready();

        if (this.isActive) {
            this._refresh();
        }
    }

    _isActiveChanged(isActive: boolean) {
        if (isActive && this.isReady) {
            this._refresh();
        }
    }
    _handleGetUserSettingsResponse(e: CustomEvent) {
        var userSettings = e.detail.response;

        this.title = userSettings.homeTitle;
        this.image = userSettings.homeImageUrl;
    }

    _refresh() {
        (<HomeList>this.$.allRecipes).refresh();
        (<HomeList>this.$.beefRecipes).refresh();
        (<HomeList>this.$.poultryRecipes).refresh();
        (<HomeList>this.$.porkRecipes).refresh();
        (<HomeList>this.$.seafoodRecipes).refresh();
        (<HomeList>this.$.pastaRecipes).refresh();
        (<HomeList>this.$.vegetarianRecipes).refresh();
        (<HomeList>this.$.sideRecipes).refresh();
        (<HomeList>this.$.drinkRecipes).refresh();
        (<IronAjaxElement>this.$.userSettingsAjax).generateRequest();
    }
}
