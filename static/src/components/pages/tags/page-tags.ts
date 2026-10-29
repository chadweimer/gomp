import { Gesture } from '@ionic/core';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { SortDir, Tag, TagSortBy } from '../../../helpers/schema.gen';
import { api } from '../../../helpers/api';
import { ResultsPerPage, showResultsPerPageAlert } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, createSwipeGesture, isNull } from '../../../helpers/utils';
import { getDefaultSearchFilter, SwipeDirection } from '../../../models';
import appState from '../../../stores/state';
import '../../page-navigator/page-navigator';
import './page-tags.css';

@customElement('page-tags')
export class PageTags extends LitElement implements ComponentWithActivatedCallback {
  private gesture: Gesture | null = null;

  @state() private tags: Tag[] | null = null;
  @state() private sortBy: TagSortBy = TagSortBy.Count;
  @state() private sortDir: SortDir = SortDir.Desc;
  @state() private page = 1;
  @state() private numPages = 1;
  @state() private resultsPerPage: ResultsPerPage = 60;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.gesture = createSwipeGesture(this, swipe => {
      switch (swipe) {
        case SwipeDirection.Right:
          if (this.page > 1) {
            this.setPage(this.page - 1);
          }
          break;
        case SwipeDirection.Left:
          if (this.page < this.numPages) {
            this.setPage(this.page + 1);
          }
          break;
      }
    });
    this.gesture?.enable();
    this.load().catch(console.error);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.gesture?.destroy();
    this.gesture = null;
  }

  async activatedCallback() {
    await this.load();
  }

  render() {
    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons class="ion-justify-content-center">
            <ion-button color="secondary" @click=${() => this.onSortByClicked()}>
              <ion-icon slot="start" icon="swap-vertical"></ion-icon>
              ${this.sortBy}
            </ion-button>
            <ion-button color="secondary" @click=${() => this.onSortDirClicked()}>
              <ion-icon slot="start" icon=${this.sortDir === SortDir.Asc ? 'arrow-up' : 'arrow-down'}></ion-icon>
              ${this.sortDir}
            </ion-button>
            <ion-button color="secondary" @click=${() => this.onResultsPerPageClicked()}>
              ${this.resultsPerPage}
              <ion-icon slot="end" icon="caret-down"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <ion-grid class="no-pad">
          <ion-row>
            ${this.tags?.map(item => html`
              <ion-col key=${item.tag} size="12" size-md="6" size-lg="4" size-xl="3">
                <ion-item href="/recipes" @click=${() => this.onTagClicked(item.tag)}>
                  <ion-label>${item.tag}</ion-label>
                  <ion-icon slot="end" name="bookmark" size="small"></ion-icon>
                  <ion-note slot="end">${item.count}</ion-note>
                </ion-item>
              </ion-col>
            `)}
          </ion-row>
        </ion-grid>
      </ion-content>

      <ion-footer>
        <ion-toolbar color="light">
          <page-navigator
            class="ion-justify-content-center"
            color="secondary"
            .page=${this.page}
            .numPages=${this.numPages}
            @pageChanged=${(e: CustomEvent<number>) => this.setPage(e.detail)}
          ></page-navigator>
        </ion-toolbar>
      </ion-footer>
    `;
  }

  private async load() {
    try {
      const { data, error } = await api.client.GET('/tags', {
        params: {
          query: {
            sort: this.sortBy,
            dir: this.sortDir,
            page: this.page,
            count: this.resultsPerPage
          }
        }
      });

      if (error || isNull(data)) {
        throw new Error('Failed to load tags.', { cause: error });
      }

      this.tags = data.tags ?? [];
      this.numPages = Math.max(Math.ceil(data.total / this.resultsPerPage), 1);
    } catch (ex) {
      this.tags = null;
      this.numPages = 1;
      console.error(ex);
    }
  }

  private setPage(page: number) {
    this.page = page;
    this.load().catch(console.error);
  }

  private onSortByClicked() {
    this.sortBy = this.sortBy === TagSortBy.Tag ? TagSortBy.Count : TagSortBy.Tag;
    this.page = 1;
    this.load().catch(console.error);
  }

  private onSortDirClicked() {
    this.sortDir = this.sortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc;
    this.page = 1;
    this.load().catch(console.error);
  }

  private async onResultsPerPageClicked() {
    await showResultsPerPageAlert(this.resultsPerPage, count => {
      this.resultsPerPage = count;
      this.page = 1;
      this.load().catch(console.error);
    });
  }

  private onTagClicked(tag: string) {
    const filter = getDefaultSearchFilter();
    appState.searchFilter = {
      ...filter,
      states: [],
      tags: [tag]
    };
  }
}
