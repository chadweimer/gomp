'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { RecipeCompact } from '../models/models.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-card/paper-card.js';
import '@cwmr/paper-chip/paper-chip.js';
import './recipe-rating.js';
import '../shared-styles.js';

@customElement('recipe-card')
export class RecipeCard extends GompBaseElement {
    static get template() {
        return html`
            <style include="shared-styles">
                :host {
                    display: block;
                    color: var(--primary-text-color);
                    cursor: pointer;

                    --paper-card-header: {
                        height: 175px;

                        @apply --recipe-card-header;
                    }
                    --paper-card-header-image: {
                        margin-top: -25%;
                    }
                    --paper-card-content: {
                        padding-top: 12px;
                        padding-bottom: 0px;

                        @apply --recipe-card-content;
                    }
                    --paper-card: {
                        width: 100%;

                        @apply --recipe-card;
                    }
                    --recipe-rating-size: var(--recipe-card-rating-size, 18px);
                    --paper-icon-button: {
                        width: 36px;
                        height: 36px;
                        color: var(--paper-grey-800);
                    }
                }
                paper-card:hover {
                    @apply --shadow-elevation-6dp;
                }
                .truncate {
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .subhead {
                    position: absolute;
                    right: 16px;
                    color: var(--secondary-text-color);
                    font-size: 0.8em;
                    font-weight: lighter;
                    line-height: 1.2em;
                }
                .container {
                    position: relative;
                }
                .state {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                }
                .state[hidden] {
                    display: none !important;
                }
          </style>

          <div class="container">
            <a href\$="/recipes/[[recipe.id]]/view">
                <paper-card image="[[recipe.thumbnailUrl]]">
                    <div class="card-content">
                        <div class="truncate">[[recipe.name]]</div>
                        <div class="subhead" hidden\$="[[hideCreatedModifiedDates]]">
                            <span>[[formatDate(recipe.createdAt)]]</span>
                            <span hidden\$="[[!showModifiedDate(recipe)]]">&nbsp; (edited [[formatDate(recipe.modifiedAt)]])</span>
                        </div>
                        <recipe-rating recipe="{{recipe}}" readonly\$="[[readonly]]"></recipe-rating>
                    </div>
                    <div class="card-actions">
                        <a href="/recipes/[[recipe.id]]/edit">
                            <paper-icon-button icon="icons:create"></paper-icon-button>
                        </a>
                        <paper-icon-button icon="icons:archive" on-click="onArchive"></paper-icon-button>
                        <paper-icon-button icon="icons:delete" on-click="onDelete"></paper-icon-button>
                        <paper-icon-button icon="icons:list" on-click="onAddToList"></paper-icon-button>
                    </div>
                </paper-card>
            </a>
            <paper-chip class="state" hidden\$="[[areEqual(recipe.state, 'active')]]">[[recipe.state]]</paper-chip>
        </div>
`;
    }

    @property({type: Object, notify: true})
    public recipe: RecipeCompact = null;

    @property({type: Boolean, notify: true})
    public hideCreatedModifiedDates = false;

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString();
    }
    protected showModifiedDate(recipe: RecipeCompact) {
        if (!recipe) {
            return false;
        }
        return recipe.modifiedAt !== recipe.createdAt;
    }
    protected onArchive(e: CustomEvent) {
        e.preventDefault();
    }
    protected onDelete(e: CustomEvent) {
        e.preventDefault();
    }
    protected onAddToList(e: CustomEvent) {
        e.preventDefault();
    }
}
