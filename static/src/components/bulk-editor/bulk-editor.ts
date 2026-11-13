import { SelectCustomEvent } from '@ionic/core';
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { globalStyles } from '../../global/shared-styles';
import { RecipeState } from '../../helpers/schema.gen';
import { configureModalCanDismiss, configureModalSelectsWorkaround, getContainingModal } from '../../helpers/modals';
import '../tags-input/tags-input';

export interface BulkEditResult {
  state?: RecipeState;
  addTags: string[];
  removeTags: string[];
}

@customElement('bulk-editor')
export class BulkEditor extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }
    `
  ];

  @property({ type: Number }) count: number = 0;
  @property({ type: Array }) favoriteTags: string[] = [];

  @state() private state?: RecipeState;
  @state() private addTags: string[] = [];
  @state() private removeTags: string[] = [];

  private parentModal?: HTMLIonModalElement | null;

  override connectedCallback() {
    super.connectedCallback();
    this.parentModal = getContainingModal(this);
    configureModalCanDismiss(this.parentModal, (_data?: unknown, role?: string) => {
      if (role === 'save') {
        return false;
      }
      return this.state != null || this.addTags.length > 0 || this.removeTags.length > 0;
    });
  }

  override firstUpdated() {
    configureModalSelectsWorkaround(this);
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons slot="primary">
            <ion-button color="primary" @click=${() => this.onSaveClicked()}>Apply</ion-button>
          </ion-buttons>
          <ion-title>Edit Recipes (${this.count})</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" @click=${() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <ion-list lines="full">
          <ion-item lines="full">
            <ion-select
              label="State"
              label-placement="stacked"
              interface="popover"
              .value=${this.state}
              placeholder="No change"
              @ionChange=${(e: SelectCustomEvent<RecipeState | undefined>) => (this.state = e.detail.value)}
            >
              <ion-select-option .value=${undefined}>No change</ion-select-option>
              <ion-select-option .value=${RecipeState.Active}>Active</ion-select-option>
              <ion-select-option .value=${RecipeState.Archived}>Archived</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Tags to Add</ion-label>
            <tags-input
              .value=${this.addTags}
              .suggestions=${this.favoriteTags}
              @valueChanged=${(e: CustomEvent<string[]>) => (this.addTags = e.detail)}
            >
              <ion-input enterkeyhint="enter"></ion-input>
            </tags-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Tags to Remove</ion-label>
            <tags-input
              .value=${this.removeTags}
              .suggestions=${this.favoriteTags}
              @valueChanged=${(e: CustomEvent<string[]>) => (this.removeTags = e.detail)}
            >
              <ion-input enterkeyhint="enter"></ion-input>
            </tags-input>
          </ion-item>
        </ion-list>
      </ion-content>
    `;
  }

  private async onSaveClicked() {
    await this.parentModal?.dismiss(
      {
        state: this.state,
        addTags: this.addTags,
        removeTags: this.removeTags,
      },
      'save'
    );
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bulk-editor': BulkEditor;
  }
}
