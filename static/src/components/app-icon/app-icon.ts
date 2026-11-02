import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

@customElement('app-icon')
export class AppIcon extends LitElement {
  static readonly styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-size: var(--icon-size, 1.4rem);
      vertical-align: middle;
      contain: layout style;
      box-sizing: content-box;
      color: inherit;
    }

    :host([size='small']) {
      font-size: 1.2rem;
    }

    :host([size='large']) {
      font-size: 1.7rem;
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
  `;

  @property({ type: String }) name = '';
  @property({ type: Boolean }) fill = false;
  @property({ type: String, reflect: true }) size?: 'small' | 'large';

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
