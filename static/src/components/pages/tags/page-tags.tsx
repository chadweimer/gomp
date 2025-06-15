import { Component, h, Host, Method, State } from '@stencil/core';
import { SortDir } from '../../../generated';
import { recipesApi } from '../../../helpers/api';
import { isNull } from '../../../helpers/utils';
import state from '../../../stores/state';
import { getDefaultSearchFilter } from '../../../models';

@Component({
  tag: 'page-tags',
  styleUrl: 'page-tags.css'
})
export class PageTags {
  @State() tags: { [tag: string]: number } | null;
  @State() sortBy: 'tag' | 'count' = 'count';
  @State() sortDir: SortDir = SortDir.Desc;

  async connectedCallback() {
    await this.load();
  }

  @Method()
  async activatedCallback() {
    await this.load();
  }

  render() {
    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-buttons class="ion-justify-content-center">
              <ion-button color="secondary" onClick={() => this.sortBy = this.sortBy === 'tag' ? 'count' : 'tag'}>
                <ion-icon slot="start" icon='swap-vertical' />
                {this.sortBy}
              </ion-button>
              <ion-button color="secondary" onClick={() => this.sortDir = this.sortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc}>
                <ion-icon slot="start" icon={this.sortDir === SortDir.Asc ? 'arrow-up' : 'arrow-down'} />
                {this.sortDir}
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-grid class="no-pad">
            <ion-row>
              {!isNull(this.tags) ?
                Object.entries(this.tags).sort(([keyA, valA], [keyB, valB]) => this.compare(keyA, valA, keyB, valB)).map(([key, val]) =>
                  <ion-col key={key} size="12" size-md="6" size-lg="4" size-xl="3">
                    <ion-item href="/recipes" onClick={() => this.onTagClicked(key)}>
                      <ion-label>{key}</ion-label>
                      <ion-icon slot="end" name="bookmark" size="small" />
                      <ion-note slot="end">{val}</ion-note>
                    </ion-item>
                  </ion-col>
                )
                : ''}
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
  }

  private async load() {
    try {
      this.tags = await recipesApi.getAllTags();
    } catch (ex) {
      this.tags = null;
      console.error(ex);
    }
  }

  private onTagClicked(tag: string) {
    const filter = getDefaultSearchFilter();
    state.searchFilter = {
      ...filter,
      states: [],
      tags: [tag]
    };
  }

  private compare(keyA: string, valA: number, keyB: string, valB: number): number {
    const lessthan = this.sortDir === SortDir.Asc ? -1 : 1;
    const greaterthan = this.sortDir === SortDir.Asc ? 1 : -1;
    switch (this.sortBy) {
      case 'tag':
        if (keyA < keyB) {
          return lessthan;
        } else if (keyA > keyB) {
          return greaterthan;
        }
        break;
      case 'count':
        if (valA < valB) {
          return lessthan;
        } else if (valA > valB) {
          return greaterthan;
        }
        break;
    }
    return 0;
  }
}
