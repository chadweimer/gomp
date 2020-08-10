'use strict';
import { html } from '@polymer/polymer/polymer-element.js';
import {customElement, property } from '@polymer/decorators';
import { IronAjaxElement } from '@polymer/iron-ajax/iron-ajax.js';
import { PaperDialogElement } from '@polymer/paper-dialog';
import { GompBaseElement } from '../common/gomp-base-element.js';
import { ConfirmationDialog } from './confirmation-dialog.js';
import { RecipeCompact, RecipeList } from '../models/models.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-radio-group/paper-radio-group.js';
import '@cwmr/paper-chip/paper-chip.js';
import './confirmation-dialog.js';
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
                        padding: 12px 16px 0px 16px;

                        @apply --recipe-card-content;
                    }
                    --paper-card-actions: {
                        @apply --recipe-card-actions;
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
                #confirmArchiveDialog {
                    --confirmation-dialog-title-color: var(--paper-purple-500);
                }
                #confirmUnarchiveDialog {
                    --confirmation-dialog-title-color: var(--paper-purple-500);
                }
                #confirmDeleteDialog {
                    --confirmation-dialog-title-color: var(--paper-red-500);
                }
                #addToListDialog paper-radio-group > * {
                    display: block;
                }
                #addToListDialog paper-dropdown-menu-light {
                    width: 300px;
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
                        <paper-icon-button icon="icons:create" on-click="onEdit"></paper-icon-button>
                        <paper-icon-button icon="icons:archive" on-click="onArchive" hidden\$="[[!areEqual(recipe.state, 'active')]]"></paper-icon-button>
                        <paper-icon-button icon="icons:unarchive" on-click="onUnarchive" hidden\$="[[areEqual(recipe.state, 'active')]]"></paper-icon-button>
                        <paper-icon-button icon="icons:delete" on-click="onDelete"></paper-icon-button>
                        <paper-icon-button icon="icons:list" on-click="onAddToList"></paper-icon-button>
                    </div>
                </paper-card>
            </a>
            <paper-chip class="state" hidden\$="[[areEqual(recipe.state, 'active')]]">[[recipe.state]]</paper-chip>
        </div>

        <confirmation-dialog id="confirmArchiveDialog" icon="icons:archive" title="Archive Recipe?" message="Are you sure you want to archive this recipe?" on-confirmed="archiveRecipe"></confirmation-dialog>
        <confirmation-dialog id="confirmUnarchiveDialog" icon="icons:unarchive" title="Unarchive Recipe?" message="Are you sure you want to unarchive this recipe?" on-confirmed="unarchiveRecipe"></confirmation-dialog>
        <confirmation-dialog id="confirmDeleteDialog" icon="icons:delete" title="Delete Recipe?" message="Are you sure you want to delete this recipe?" on-confirmed="deleteRecipe"></confirmation-dialog>

        <paper-dialog id="addToListDialog" on-iron-overlay-opened="addToListDialogOpened" on-iron-overlay-closed="addToListDialogClosed" with-backdrop="">
            <h3>Add to List</h3>
            <paper-radio-group>
                <paper-radio-button name="new">New List</paper-radio-button>
                <paper-input label="Name" always-float-label="" value=""></paper-input>
                <paper-radio-button name="existing">Existing List</paper-radio-button>
                <paper-dropdown-menu-light label="Select" always-float-label="">
                    <paper-listbox slot="dropdown-content" class="dropdown-content" selected="" attr-for-selected="name" fallback-selection="name">
                    </paper-listbox>
                </paper-dropdown-menu-light>
            </paper-radio-group>
            <div class="buttons">
                <paper-button dialog-dismiss="">Cancel</paper-button>
                <paper-button dialog-confirm="">Apply</paper-button>
            </div>
        </paper-dialog>

        <iron-ajax bubbles="" id="updateStateAjax" url="/api/v1/recipes/[[recipe.id]]/state" method="PUT" on-response="handleUpdateStateResponse"></iron-ajax>
        <iron-ajax bubbles="" id="deleteAjax" url="/api/v1/recipes/[[recipe.id]]" method="DELETE" on-response="handleDeleteRecipeResponse"></iron-ajax>
        <iron-ajax bubbles="" id="getListsAjax" url="/api/v1/lists" method="GET" on-response="handleGetListsResponse"></iron-ajax>
`;
    }

    @property({type: Object, notify: true})
    public recipe: RecipeCompact = null;

    @property({type: Boolean, notify: true})
    public hideCreatedModifiedDates = false;

    @property({type: Boolean, reflectToAttribute: true})
    public readonly = false;

    protected recipeLists: RecipeList[] = [];

    private get confirmArchiveDialog(): ConfirmationDialog {
        return this.$.confirmArchiveDialog as ConfirmationDialog;
    }
    private get confirmUnarchiveDialog(): ConfirmationDialog {
        return this.$.confirmUnarchiveDialog as ConfirmationDialog;
    }
    private get confirmDeleteDialog(): ConfirmationDialog {
        return this.$.confirmDeleteDialog as ConfirmationDialog;
    }
    private get addToListDialog(): PaperDialogElement {
        return this.$.addToListDialog as PaperDialogElement;
    }
    private get updateStateAjax(): IronAjaxElement {
        return this.$.updateStateAjax as IronAjaxElement;
    }
    private get deleteAjax(): IronAjaxElement {
        return this.$.deleteAjax as IronAjaxElement;
    }
    private get getListsAjax(): IronAjaxElement {
        return this.$.getListsAjax as IronAjaxElement;
    }

    protected formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString();
    }
    protected showModifiedDate(recipe: RecipeCompact) {
        if (!recipe) {
            return false;
        }
        return recipe.modifiedAt !== recipe.createdAt;
    }
    protected onEdit(e: CustomEvent) {
        e.preventDefault();

        this.dispatchEvent(new CustomEvent('change-page', {bubbles: true, composed: true, detail: {url: '/recipes/' + this.recipe.id + '/edit'}}));
    }
    protected onArchive(e: CustomEvent) {
        e.preventDefault();

        this.confirmArchiveDialog.open();
    }
    protected onUnarchive(e: CustomEvent) {
        e.preventDefault();

        this.confirmUnarchiveDialog.open();
    }
    protected onDelete(e: CustomEvent) {
        e.preventDefault();

        this.confirmDeleteDialog.open();
    }
    protected onAddToList(e: CustomEvent) {
        e.preventDefault();

        this.getListsAjax.generateRequest();
        // TODO: Move to only after getting response?
        this.addToListDialog.open();
    }

    protected archiveRecipe() {
        this.updateStateAjax.body = JSON.stringify('archived') as any;
        this.updateStateAjax.generateRequest();
    }
    protected unarchiveRecipe() {
        this.updateStateAjax.body = JSON.stringify('active') as any;
        this.updateStateAjax.generateRequest();
    }
    protected deleteRecipe() {
        this.deleteAjax.generateRequest();
    }

    protected addToListDialogOpened() {
        // TODO
    }
    protected addToListDialogClosed() {
        // TODO
    }

    protected handleUpdateStateResponse() {
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    protected handleDeleteRecipeResponse() {
        this.dispatchEvent(new CustomEvent('recipes-modified', {bubbles: true, composed: true}));
    }
    protected handleGetListsResponse() {
        // TODO
    }
}
