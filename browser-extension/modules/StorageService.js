// StorageService: abstracts localStorage/chrome.storage

/**
 * @interface IStorageService
 * Methods: get(key): Promise<any>, set(key, value): Promise<void>
 * Implement this interface to provide custom storage backends.
 */

export class StorageService {
  constructor() {
    this.storage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local)
      ? chrome.storage.local
      : window.localStorage;
  }

  async get(key) {
    if (this.storage === window.localStorage) {
      return JSON.parse(this.storage.getItem(key));
    } else {
      return new Promise(resolve => {
        this.storage.get([key], result => resolve(result[key]));
      });
    }
  }

  async set(key, value) {
    if (this.storage === window.localStorage) {
      this.storage.setItem(key, JSON.stringify(value));
    } else {
      return new Promise(resolve => {
        this.storage.set({ [key]: value }, () => resolve());
      });
    }
  }
}
