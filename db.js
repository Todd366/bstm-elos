/* db.js — IndexedDB wrapper for BSTM ELOS
   Stores: trials, patterns, principles, attachments, meta
   Falls back to localStorage if IndexedDB is unavailable. */

const ELOSDB = (() => {
  const DB_NAME = 'bstm_elos';
  const DB_VERSION = 1;
  const STORES = ['trials', 'patterns', 'principles', 'attachments', 'meta'];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { resolve(null); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null); // fall back to localStorage
    });
    return dbPromise;
  }

  // --- localStorage fallback helpers ---
  function lsKey(store) { return 'elos_' + store; }
  function lsGetAll(store) {
    try { return JSON.parse(localStorage.getItem(lsKey(store)) || '[]'); }
    catch { return []; }
  }
  function lsSaveAll(store, arr) {
    localStorage.setItem(lsKey(store), JSON.stringify(arr));
  }

  async function put(store, obj) {
    const db = await open();
    if (!db) {
      const all = lsGetAll(store);
      const i = all.findIndex(x => x.id === obj.id);
      if (i >= 0) all[i] = obj; else all.push(obj);
      lsSaveAll(store, all);
      return obj;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(obj);
      tx.oncomplete = () => resolve(obj);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function remove(store, id) {
    const db = await open();
    if (!db) {
      lsSaveAll(store, lsGetAll(store).filter(x => x.id !== id));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAll(store) {
    const db = await open();
    if (!db) return lsGetAll(store);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(store, id) {
    const db = await open();
    if (!db) return lsGetAll(store).find(x => x.id === id) || null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function exportAll() {
    const out = {};
    for (const s of STORES) out[s] = await getAll(s);
    out.exportedAt = new Date().toISOString();
    out.version = DB_VERSION;
    return out;
  }

  async function importAll(data, { merge = false } = {}) {
    for (const s of STORES) {
      if (!Array.isArray(data[s])) continue;
      if (!merge) {
        const existing = await getAll(s);
        for (const e of existing) await remove(s, e.id);
      }
      for (const item of data[s]) await put(s, item);
    }
  }

  async function clearAll() {
    for (const s of STORES) {
      const existing = await getAll(s);
      for (const e of existing) await remove(s, e.id);
    }
  }

  function uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  return { put, remove, getAll, get, exportAll, importAll, clearAll, uid, STORES };
})();
