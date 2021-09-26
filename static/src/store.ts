import { createStore, Subscription } from '@stencil/store';
import { AppConfiguration, AppInfo, DefaultSearchFilter, SearchFilter, User } from './models';

interface AppState {
  appInfo: AppInfo;
  appConfig: AppConfiguration;
  jwtToken?: string;
  currentUser?: User;
  search: SearchFilter;
}

const { state, use } = createStore<AppState>({
  appInfo: {
    version: '<Unknown>'
  },
  appConfig: {
    title: 'GOMP: Go Meal Planner'
  },
  search: new DefaultSearchFilter()
});

class StorageSync implements Subscription<AppState> {
  get(key: keyof AppState) {
    switch (key) {
      case 'jwtToken':
        state.jwtToken = localStorage.getItem(key);
        break;

      case 'search':
        {
          const sessionSearch = sessionStorage.getItem('search');
          if (sessionSearch) {
            state.search = JSON.parse(sessionSearch);
          } else {
            state.search = new DefaultSearchFilter();
          }
        }
        break;
    }
  }
  set(key: keyof AppState, newValue: AppState[keyof AppState]) {
    switch (key) {
      case 'jwtToken':
        if (newValue) {
          localStorage.setItem(key, newValue as string);
        } else {
          localStorage.removeItem(key);
        }
        break;

      case 'search':
        if (newValue) {
          sessionStorage.setItem(key, JSON.stringify(newValue));
        } else {
          sessionStorage.setItem(key, JSON.stringify(new DefaultSearchFilter()));
        }
        break;
    }
  }
  reset() {
    localStorage.clear();
    sessionStorage.clear();
  }
}

use(new StorageSync());

export default state;
