import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { emit, isNullOrEmpty } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';
import '../app-icon/app-icon';

@customElement('tags-input')
export class TagsInput extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      :host:focus-within ion-label {
        color: var(--ion-color-primary);
      }
    `
  ];

  @property({ type: String }) label?: string;
  @property({ type: String, attribute: 'label-placement' }) labelPlacement?: 'fixed' | 'floating' | 'stacked';
  @property({ type: Array }) value: string[] = [];
  @property({ type: Array }) suggestions: string[] = [];

  @state() private internalValue: string[] = [];
  @state() private filteredSuggestions: string[] = [];

  constructor() {
    super();
    this.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeyDown(e));
  }

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('value')) {
      this.internalValue = this.value ?? [];
      this.filterSuggestedTags(this.suggestions);
    }
    if (changedProperties.has('suggestions')) {
      this.filterSuggestedTags(this.suggestions);
    }
  }

  addTag(tag: string) {
    this.internalValue = [
      ...this.internalValue,
      tag.toLowerCase()
    ].filter((value, index, self) => self.indexOf(value) === index);
    this.filterSuggestedTags(this.suggestions);
    emit(this, 'valueChanged', this.internalValue);
  }

  removeTag(tag: string) {
    this.internalValue = this.internalValue.filter(value => value !== tag);
    this.filterSuggestedTags(this.suggestions);
    emit(this, 'valueChanged', this.internalValue);
  }

  render() {
    return html`
      ${!isNullOrEmpty(this.label)
        ? html`<ion-label position=${ifDefined(this.labelPlacement)}>${this.label}</ion-label>`
        : nothing}
      ${this.internalValue.length > 0
        ? html`
            <div class="ion-padding-top">
              ${this.internalValue.map(
          tag => html`
                  <ion-chip @click=${() => this.removeTag(tag)}>
                    ${tag}
                    <app-icon class="end" name="close" size="small"></app-icon>
                  </ion-chip>
                `
        )}
            </div>
          `
        : nothing}
      <slot></slot>
      <div class="ion-padding-bottom">
        ${this.filteredSuggestions.map(
          tag => html`
            <ion-chip class="suggested" color="secondary" @click=${() => this.addTag(tag)}>
              ${tag}
              <app-icon class="end" name="add" size="small"></app-icon>
            </ion-chip>
          `
        )}
      </div>
    `;
  }

  private handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const tagName = target.tagName.toLowerCase();
    if (tagName !== 'input' && tagName !== 'ion-input') {
      return;
    }

    if (e.key === 'Enter') {
      const input = target as HTMLInputElement | HTMLIonInputElement;
      const val = typeof input.value === 'string' ? input.value.trim() : '';
      if (!isNullOrEmpty(val)) {
        e.preventDefault();
        e.stopPropagation();
        this.addTag(val);
        input.value = '';
      }
    }
  }

  private filterSuggestedTags(suggestions: string[] | null) {
    this.filteredSuggestions = suggestions?.filter(value => !(this.internalValue.includes(value))) ?? [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tags-input': TagsInput;
  }
}
