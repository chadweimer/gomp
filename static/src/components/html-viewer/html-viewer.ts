import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { globalStyles } from '../../global/shared-styles';

@customElement('html-viewer')
export class HTMLViewer extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
        overflow-wrap: anywhere;
        word-break: normal;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      img:not([style*='height' i]) {
        max-height: 400px;
      }
    `
  ];

  @property({ type: String }) value = '';

  render() {
    return html`<div .innerHTML=${this.value ?? ''}></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'html-viewer': HTMLViewer;
  }
}
