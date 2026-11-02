import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { emit } from '../../helpers/utils';
import '../app-icon/app-icon';

@customElement('page-navigator')
export class PageNavigator extends LitElement {
  static readonly styles = css`
    :host {
      display: flex;
      contain: content;
      color: var(--ion-color-base, inherit);
    }
  `;

  @property({ type: Number }) page = 1;
  @property({ type: Number }) numPages = 1;
  @property({ type: String, reflect: true }) fill?: 'clear' | 'outline' | 'solid' | 'default';
  @property({ type: String, reflect: true }) size?: 'small' | 'large';

  render() {
    return html`
      <ion-buttons>
        <ion-button
          fill=${ifDefined(this.fill)}
          ?disabled=${this.page === 1}
          @click=${() => this.onClick(1)}
        >
          <app-icon slot="icon-only" name="first_page" size=${ifDefined(this.size)}></app-icon>
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          ?disabled=${this.page === 1}
          @click=${() => this.onClick(this.page - 1)}
        >
          <app-icon slot="icon-only" name="chevron_left" size=${ifDefined(this.size)}></app-icon>
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          disabled
        >
          ${this.page} of ${this.numPages}
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          ?disabled=${this.page === this.numPages}
          @click=${() => this.onClick(this.page + 1)}
        >
          <app-icon slot="icon-only" name="chevron_right" size=${ifDefined(this.size)}></app-icon>
        </ion-button>
        <ion-button
          fill=${ifDefined(this.fill)}
          ?disabled=${this.page === this.numPages}
          @click=${() => this.onClick(this.numPages)}
        >
          <app-icon slot="icon-only" name="last_page" size=${ifDefined(this.size)}></app-icon>
        </ion-button>
      </ion-buttons>
    `;
  }

  private onClick(page: number) {
    emit(this, 'pageChanged', page);
  }
}
