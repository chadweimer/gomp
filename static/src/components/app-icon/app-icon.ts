import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { globalStyles } from '../../global/shared-styles';

@customElement('app-icon')
export class AppIcon extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        font-size: var(--icon-size, 1.5rem);
        vertical-align: middle;
        contain: layout style;
        box-sizing: content-box;
        color: inherit;
      }

      :host([size='small']) {
        font-size: 1.2rem;
      }

      :host([size='large']) {
        font-size: 1.8rem;
      }

      :host([color='primary']) {
        color: var(--ion-color-primary, #673ab7);
      }

      :host([color='secondary']) {
        color: var(--ion-color-secondary, #009688);
      }

      :host([color='tertiary']) {
        color: var(--ion-color-tertiary, #ff9800);
      }

      :host([color='danger']) {
        color: var(--ion-color-danger, #eb445a);
      }

      :host([color='medium']) {
        color: var(--ion-color-medium, #737373);
      }

      :host([color='light']) {
        color: var(--ion-color-light, #f2f2f2);
      }

      :host([color='dark']) {
        color: var(--ion-color-dark, #333333);
      }

      .symbol {
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;
        font-size: inherit;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        font-feature-settings: 'liga';
        -webkit-font-feature-settings: 'liga';
        -webkit-font-smoothing: antialiased;
        user-select: none;
      }

      .symbol.filled {
        font-variation-settings: 'FILL' 1;
      }
    `
  ];

  @property({ type: String }) name = '';
  @property({ type: Boolean }) fill = false;
  @property({ type: String, reflect: true }) size?: 'small' | 'large';
  @property({ type: String, reflect: true }) color?: string;

  render() {
    return html`
      <span
        aria-hidden="true"
        class=${classMap({
      symbol: true,
      filled: this.fill,
    })}
      >${this.name}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-icon': AppIcon;
  }
}
