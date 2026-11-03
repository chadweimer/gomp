import { ReactiveController, ReactiveControllerHost } from 'lit';
import { isNull } from './utils';

export interface StorageControllerOptions<T> {
  syncCrossTabs?: boolean;
  onUpdate?: (value: T) => void;
}

export class StorageController<T> implements ReactiveController {
  private value: T;
  private readonly defaultValue: T;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly key: string,
    private readonly storage: Storage,
    defaultValue: T,
    private readonly options?: StorageControllerOptions<T>
  ) {
    this.defaultValue = defaultValue;
    this.host.addController(this);
    this.value = this.read() ?? defaultValue;
  }

  hostConnected() {
    if (this.options?.syncCrossTabs && typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  hostDisconnected() {
    if (this.options?.syncCrossTabs && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
  }

  get(): T {
    return this.value;
  }

  set(newValue: T) {
    if (Object.is(this.value, newValue)) {
      return;
    }
    this.value = newValue;
    this.write(newValue);
    this.options?.onUpdate?.(newValue);
    this.host.requestUpdate();
  }

  reset() {
    this.set(this.defaultValue);
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.storageArea === this.storage && event.key === this.key) {
      const parsed = this.parse(event.newValue) ?? this.defaultValue;
      if (!Object.is(this.value, parsed)) {
        this.value = parsed;
        this.options?.onUpdate?.(parsed);
        this.host.requestUpdate();
      }
    }
  };

  private read(): T | null {
    if (typeof window === 'undefined' || !this.storage) {
      return null;
    }
    const raw = this.storage.getItem(this.key);
    return this.parse(raw);
  }

  private parse(raw: string | null): T | null {
    if (isNull(raw)) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      this.storage.removeItem(this.key);
      console.warn(`Failed to parse stored value for ${this.key}: ${raw}`, e);
      return null;
    }
  }

  private write(val: T) {
    if (typeof window === 'undefined' || !this.storage) {
      return;
    }
    if (isNull(val) || val === undefined) {
      this.storage.removeItem(this.key);
    } else {
      this.storage.setItem(this.key, JSON.stringify(val));
    }
  }
}
