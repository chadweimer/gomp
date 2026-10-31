import { ReactiveController, ReactiveControllerHost } from 'lit';

type Listener<T> = (value: T) => void;
type AnyListener<T> = (prop: keyof T, value: unknown) => void;

export interface Store<T extends object> {
  state: T;
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  reset(): void;
  onChange<K extends keyof T>(key: K, listener: Listener<T[K]>): () => void;
  subscribe(listener: AnyListener<T>): () => void;
}

export function createStore<T extends object>(initialState: T): Store<T> {
  const initialCopy = { ...initialState };
  const currentData = { ...initialState };
  const propListeners = new Map<keyof T, Set<Listener<never>>>();
  const allListeners = new Set<AnyListener<T>>();

  const get = <K extends keyof T>(key: K): T[K] => {
    return currentData[key];
  };

  const set = <K extends keyof T>(key: K, value: T[K]) => {
    const prev = currentData[key];
    if (Object.is(prev, value)) {
      return;
    }
    currentData[key] = value;

    const specific = propListeners.get(key);
    if (specific) {
      for (const listener of specific) {
        (listener as unknown as Listener<T[K]>)(value);
      }
    }

    for (const listener of allListeners) {
      listener(key, value);
    }
  };

  const reset = () => {
    for (const k of Object.keys(currentData) as (keyof T)[]) {
      if (k in initialCopy) {
        set(k, initialCopy[k]);
      } else {
        set(k, undefined as unknown as T[keyof T]);
      }
    }
  };

  const onChange = <K extends keyof T>(key: K, listener: Listener<T[K]>): (() => void) => {
    if (!propListeners.has(key)) {
      propListeners.set(key, new Set());
    }
    propListeners.get(key)!.add(listener);
    return () => {
      propListeners.get(key)?.delete(listener);
    };
  };

  const subscribe = (listener: AnyListener<T>): (() => void) => {
    allListeners.add(listener);
    return () => {
      allListeners.delete(listener);
    };
  };

  const stateProxy = new Proxy(currentData, {
    get(_target, prop: string | symbol) {
      return currentData[prop as keyof T];
    },
    set(_target, prop: string | symbol, value: unknown) {
      set(prop as keyof T, value as T[keyof T]);
      return true;
    }
  });

  return {
    state: stateProxy,
    get,
    set,
    reset,
    onChange,
    subscribe,
  };
}

export class StoreController<T extends object> implements ReactiveController {
  private unsubscribe?: () => void;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly store: Store<T>
  ) {
    this.host.addController(this);
  }

  hostConnected() {
    this.unsubscribe = this.store.subscribe(() => {
      this.host.requestUpdate();
    });
  }

  hostDisconnected() {
    this.unsubscribe?.();
  }
}
