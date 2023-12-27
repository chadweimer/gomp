import { CheckboxChangeEventDetail } from '@ionic/core';
import { Component, Event, EventEmitter, h, Prop, State } from '@stencil/core';
import { RecipeState } from '../../generated';
import { insertSpacesBetweenWords } from '../../helpers/utils';

@Component({
  tag: 'recipe-state-selector',
  styleUrl: 'recipe-state-selector.css',
})
export class RecipeStateSelector {
  @Prop() selectedStates: RecipeState[] = [RecipeState.Active];

  @State() internalSelectedStates: RecipeState[] = [];

  @Event() selectedStatesChanged: EventEmitter<RecipeState[]>;

  componentWillLoad() {
    this.internalSelectedStates = this.selectedStates;
  }

  render() {
    return (
      <ion-list>
        {Object.keys(RecipeState).map(item =>
          <ion-item key={item} lines="full">
            <ion-checkbox value={RecipeState[item]} checked={this.selectedStates.includes(RecipeState[item])} onIonChange={e => this.onSelectionChanged(e)}>{insertSpacesBetweenWords(item)}</ion-checkbox>
          </ion-item>
        )}
      </ion-list>
    );
  }


  private onSelectionChanged(e: CustomEvent<CheckboxChangeEventDetail<RecipeState>>): void {
    if (e.detail.checked) {
      this.internalSelectedStates = [
        ...this.internalSelectedStates,
        e.detail.value
      ];
    } else {
      this.internalSelectedStates = this.internalSelectedStates.filter(state => state !== e.detail.value);
    }

    this.selectedStatesChanged.emit(this.internalSelectedStates);
  }

}
