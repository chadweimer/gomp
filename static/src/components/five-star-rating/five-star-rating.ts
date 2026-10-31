import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { globalStyles } from '../../global/shared-styles';
import { emit } from '../../helpers/utils';

@customElement('five-star-rating')
export class FiveStarRating extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: inline-block;
      }

      ion-icon:not(.disabled) {
        cursor: pointer;
      }

      ion-icon {
        color: var(--five-star-rating-text-selected-color, var(--ion-color-tertiary, #fdd835));
      }

      ion-icon.hover:not(.disabled) {
        color: var(--five-star-rating-text-hover-color, var(--ion-color-tertiary-tint, #ffeb3b));
      }
    `
  ];

  @property({ type: Number }) value = 0;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) size = 'small';

  @state() private hoverValue: number | null = null;

  private readonly stars = [1, 2, 3, 4, 5];

  constructor() {
    super();
    this.addEventListener('mouseleave', () => {
      this.hoverValue = null;
    });
  }

  render() {
    const isHovering = !this.disabled && this.hoverValue !== null;
    const displayValue = isHovering ? this.hoverValue! : this.value;

    return html`
      ${this.stars.map(star => {
      const iconName = this.getIconName(star, displayValue);
      return html`
          <ion-icon
            name=${iconName}
            size=${ifDefined(this.size)}
            class=${classMap({ hover: isHovering, disabled: this.disabled, })}
            @mousemove=${(e: MouseEvent) => this.onMouseMove(e, star)}
            @click=${(e: MouseEvent) => this.onClick(e, star)}
          ></ion-icon>
        `;
    })}
    `;
  }

  private getIconName(star: number, value: number): string {
    if (value >= star) {
      return 'star';
    }
    if (value >= star - 0.5) {
      return 'star-half';
    }
    return 'star-outline';
  }

  private getRatingFromEvent(event: MouseEvent, star: number): number {
    const target = event.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      if (rect.width > 0 && event.clientX - rect.left < rect.width / 2) {
        return star - 0.5;
      }
    }
    return star;
  }

  private onMouseMove(e: MouseEvent, star: number) {
    if (!this.disabled) {
      this.hoverValue = this.getRatingFromEvent(e, star);
    }
  }

  private onClick(e: MouseEvent, star: number) {
    if (!this.disabled) {
      emit(this, 'valueSelected', this.hoverValue ?? this.getRatingFromEvent(e, star));
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'five-star-rating': FiveStarRating;
  }
}
