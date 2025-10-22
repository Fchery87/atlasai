const DB_NAME = "boltforge";
const DB_VERSION = 1;
const STORE_PROJECTS = "projects";

export type IDBProjectRecord = {
  id: string;
  data: any;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putProject(rec: IDBProjectRecord) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    tx.objectStore(STORE_PROJECTS).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProject(
  id: string,
): Promise<IDBProjectRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = () => resolve(req.result as IDBProjectRecord | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function listProjects(): Promise<IDBProjectRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const req = tx.objectStore(STORE_PROJECTS).getAll();
    req.onsuccess = () => resolve(req.result as IDBProjectRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProject(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    tx.objectStore(STORE_PROJECTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
