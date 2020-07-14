'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { GompBaseElement } from '../common/gomp-base-element.js';
import '@polymer/paper-card/paper-card.js';
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
                        height: 75%;

                        @apply --recipe-card-header;
                    }
                    --paper-card-header-image: {
                        margin-top: -25%;
                    }
                    --paper-card-content: {
                        @apply --recipe-card-content;
                    }
                    --paper-card: {
                        width: 100%;
                        height: 265px;

                        @apply --recipe-card;
                    }
                    --recipe-rating-size: var(--recipe-card-rating-size, 18px);
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
          </style>

          <a href\$="/recipes/[[recipe.id]]">
              <paper-card image="[[recipe.thumbnailUrl]]">
                  <div class="card-content">
                      <div class="truncate">[[recipe.name]]</div>
                      <div class="subhead" hidden\$="[[hideCreatedModifiedDates]]">
                          <span>[[formatDate(recipe.createdAt)]]</span>
                          <span hidden\$="[[!showModifiedDate(recipe)]]">&nbsp; (edited [[formatDate(recipe.modifiedAt)]])</span>
                      </div>
                      <recipe-rating recipe="{{recipe}}"></recipe-rating>
                  </div>
              </paper-card>
          </a>
`;
    }

    @property({type: Object, notify: true})
    public recipe: object|null = null;

    @property({type: Boolean, notify: true})
    public hideCreatedModifiedDates = false;

    protected formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString();
    }
    protected showModifiedDate(recipe: any) {
        return recipe.modifiedAt !== recipe.createdAt;
    }
}
