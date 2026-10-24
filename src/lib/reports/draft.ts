// Report draft, kept on this device only (IndexedDB), so a closed tab or a
// dropped connection does not lose the photos. Cleared after a successful send.
// Every call fails quietly: private windows may block IndexedDB entirely.

const DB = "hfa-report";
const STORE = "draft";
const KEY = "current";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  }).finally(() => db.close()) as Promise<T | null>;
}

export const loadDraft = <T>() => tx<T>("readonly", (s) => s.get(KEY) as IDBRequest<T>);
export const saveDraft = <T>(value: T) => tx("readwrite", (s) => s.put(value, KEY));
export const clearDraft = () => tx("readwrite", (s) => s.delete(KEY));
