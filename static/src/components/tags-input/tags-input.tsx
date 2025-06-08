import { Component, Event, Host, h, Prop, State, EventEmitter, Watch } from '@stencil/core';
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

  @Event() valueChanged: EventEmitter<string[]>;

  @State() internalValue: string[] = [];
  @State() filteredSuggestions: string[] = [];

  private tagsInput!: HTMLIonInputElement;

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

  render() {
    return (
      <Host>
        {!isNullOrEmpty(this.label) ? <ion-label position={this.labelPlacement}>{this.label}</ion-label> : ''}
        {this.internalValue.length > 0 ?
          <div class="ion-padding-top">
            {this.internalValue.map(tag =>
              <ion-chip key={tag} onClick={() => this.removeTag(tag)}>
                {tag}
                <ion-icon icon="close-circle" />
              </ion-chip>
            )}
          </div>
          : ''}
        <ion-input enterkeyhint="enter" onKeyDown={e => this.onTagsKeyDown(e)} ref={el => this.tagsInput = el} />
        <div class="ion-padding-bottom">
          {this.filteredSuggestions.map(tag =>
            <ion-chip key={tag} class="suggested" color="success" onClick={() => this.addTag(tag)}>
              {tag}
              <ion-icon icon="add-circle" />
            </ion-chip>
          )}
        </div>
      </Host >
    );
  }

  private filterSuggestedTags(suggestions: string[] | null) {
    this.filteredSuggestions = suggestions?.filter(value => !(this.internalValue.includes(value))) ?? [];
  }

  private addTag(tag: string) {
    this.internalValue = [
      ...this.internalValue,
      tag.toLowerCase()
    ].filter((value, index, self) => self.indexOf(value) === index);
    this.filterSuggestedTags(this.suggestions);
    this.valueChanged.emit(this.internalValue);
  }

  private removeTag(tag: string) {
    this.internalValue = this.internalValue.filter(value => value !== tag);
    this.filterSuggestedTags(this.suggestions);
    this.valueChanged.emit(this.internalValue);
  }

  private onTagsKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !isNullOrEmpty(this.tagsInput.value?.toString())) {
      this.addTag(this.tagsInput.value.toString());
      this.tagsInput.value = '';
    }
  }

}
