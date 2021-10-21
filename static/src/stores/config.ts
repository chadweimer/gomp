import { createStore } from '@stencil/store';
import { AppConfiguration, AppInfo } from '../models';

interface AppConfig {
  info: AppInfo;
  config: AppConfiguration;
}

const { state: appConfig } = createStore<AppConfig>({
  info: {
    version: '<Unknown>'
  },
  config: {
    title: 'GOMP: Go Meal Planner'
  }
});

export default appConfig;
