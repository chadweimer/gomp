import { Color } from '@ionic/core';
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { globalStyles } from '../../global/shared-styles';
import { emit } from '../../helpers/utils';

@customElement('page-navigator')
export class PageNavigator extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: flex;
        contain: content;
      }
    `
  ];

  @property({ type: Number }) page = 1;
  @property({ type: Number }) numPages = 1;
  @property({ type: String, reflect: true }) fill?: 'clear' | 'outline' | 'solid' | 'default';
  @property({ type: String, reflect: true }) color?: Color;

  render() {
    return html`
      <ion-buttons>
        <ion-button
          fill=${ifDefined(this.fill)}
          color=${ifDefined(this.color)}
          ?disabled=${this.page === 1}
          @click=${() => this.onClick(1)}
        >
          <ion-icon slot="icon-only" icon="arrow-back"></ion-icon>
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          color=${ifDefined(this.color)}
          ?disabled=${this.page === 1}
          @click=${() => this.onClick(this.page - 1)}
        >
          <ion-icon slot="icon-only" icon="chevron-back"></ion-icon>
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          color=${ifDefined(this.color)}
          disabled
        >
          ${this.page} of ${this.numPages}
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          color=${ifDefined(this.color)}
          ?disabled=${this.page === this.numPages}
          @click=${() => this.onClick(this.page + 1)}
        >
          <ion-icon slot="icon-only" icon="chevron-forward"></ion-icon>
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          color=${ifDefined(this.color)}
          ?disabled=${this.page === this.numPages}
          @click=${() => this.onClick(this.numPages)}
        >
          <ion-icon slot="icon-only" icon="arrow-forward"></ion-icon>
        </ion-button>
      </ion-buttons>
    `;
  }

  private onClick(page: number) {
    emit(this, 'pageChanged', page);
  }
}
