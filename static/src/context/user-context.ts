import { createContext } from '@lit/context';
import { User } from '../helpers/schema.gen';

export interface UserContextValue {
  user?: User;
  login(user: User): void;
  logout(): Promise<void>;
}

export const userContext = createContext<UserContextValue>('userContext');
