import { createStore, Subscription } from '@stencil/store';
import { AppConfiguration, AppInfo, User } from './models';

interface AppState {
  appInfo: AppInfo;
  appConfig: AppConfiguration;
  jwtToken?: string;
  currentUser: User;
}

const { state, use } = createStore<AppState>({
  appInfo: {
    version: '<Unknown>'
  } as AppInfo,
  appConfig: {
    title: 'GOMP: Go Meal Planner'
  } as AppConfiguration,
  currentUser: null as User
});

class StorageSync implements Subscription<AppState> {
  get(key: keyof AppState) {
    if (key === 'jwtToken') {
      state.jwtToken = localStorage.getItem(key);
    }
  }
  set(key: keyof AppState, newValue: AppState[keyof AppState]) {
    if (key === 'jwtToken') {
      if (newValue) {
        localStorage.setItem(key, newValue as string);
      } else {
        localStorage.removeItem(key);
      }
    }
  }
  reset() {
    localStorage.clear();
    sessionStorage.clear();
  }
}

use(new StorageSync());

export default state;
