import { AppConfiguration, AppInfo } from '../helpers/schema.gen';
import { createStore } from './store';

export interface AppConfig {
  info: AppInfo;
  config: AppConfiguration;
}

export const appConfigStore = createStore<AppConfig>({
  info: {
    copyright: 'Copyright © Chad Weimer',
    version: '<Unknown>'
  },
  config: {
    title: 'GOMP: Go Meal Planner'
  }
});

export default appConfigStore.state;

