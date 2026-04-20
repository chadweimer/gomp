import { Component, Event, Host, h, Prop, State, EventEmitter, Watch, Method, Listen } from '@stencil/core';
import { isNullOrEmpty } from '../../helpers/utils';

@Component({
  tag: 'tags-input',
  styleUrl: 'tags-input.css',
  scoped: true,
})
export class TagsInput {
  @Prop() label?: string;
  @Prop() labelPlacement?: 'end' | 'fixed' | 'floating' | 'stacked' | 'start';
  @Prop() value: string[] = [];
  @Prop() suggestions: string[] = [];

  @Event() valueChanged!: EventEmitter<string[]>;

  @State() internalValue: string[] = [];
  @State() filteredSuggestions: string[] = [];

  @Watch('value')
  onValueChanged(newValue: string[]) {
    this.internalValue = newValue ?? [];
    this.filterSuggestedTags(this.suggestions);
  }

  @Watch('suggestions')
  onSuggestionsChanged(newValue: string[]) {
    this.filterSuggestedTags(newValue);
  }

  connectedCallback() {
    this.onValueChanged(this.value);
  }

  @Listen('keydown', {})
  async handleKeyDown(e: KeyboardEvent) {
    // First confirm the target is an input element
    if ((e.target as HTMLElement).tagName.toLowerCase() !== 'input') {
      console.warn('Keydown event ignored: target is not an input element.');
      return;
    }

    const input = e.target as HTMLInputElement;
    if (e.key === 'Enter' && !isNullOrEmpty(input.value)) {
      await this.addTag(input.value);
      input.value = '';
    }
  }

  @Method()
  addTag(tag: string): Promise<void> {
    this.internalValue = [
      ...this.internalValue,
      tag.toLowerCase()
    ].filter((value, index, self) => self.indexOf(value) === index);
    this.filterSuggestedTags(this.suggestions);
    this.valueChanged.emit(this.internalValue);
    return Promise.resolve();
  }

  render() {
    return (
      <Host>
        {!isNullOrEmpty(this.label) && <ion-label position={this.labelPlacement}>{this.label}</ion-label>}
        {this.internalValue.length > 0 &&
          <div class="ion-padding-top">
            {this.internalValue.map(tag =>
              <ion-chip key={tag} onClick={() => this.removeTag(tag)}>
                {tag}
                <ion-icon icon="close-circle" />
              </ion-chip>
            )}
          </div>
        }
        <slot />
        <div class="ion-padding-bottom">
          {this.filteredSuggestions.map(tag =>
            <ion-chip key={tag} class="suggested" color="success" onClick={() => this.addTag(tag)}>
              {tag}
              <ion-icon icon="add-circle" />
            </ion-chip>
          )}
        </div>
      </Host>
    );
  }

  private filterSuggestedTags(suggestions: string[] | null) {
    this.filteredSuggestions = suggestions?.filter(value => !(this.internalValue.includes(value))) ?? [];
  }

  private removeTag(tag: string) {
    this.internalValue = this.internalValue.filter(value => value !== tag);
    this.filterSuggestedTags(this.suggestions);
    this.valueChanged.emit(this.internalValue);
  }
}
