import { createContext } from '@lit/context';
import { AppConfiguration, AppInfo } from '../helpers/schema.gen';

export interface ConfigContextValue {
  config?: AppConfiguration;
  info?: AppInfo;
  setConfig(config: AppConfiguration): void;
  setInfo(info: AppInfo): void;
}

export const configContext = createContext<ConfigContextValue>('configContext');
