// De laatst ingelezen catalogus, in deze browser.
//
// Een bewaarde analyse draagt geen productdata, en dat blijft zo. Maar wie
// vanuit zo'n analyse terug wil naar het koppelscherm, heeft zijn kolommen en
// producten nodig. Het bestand staat daarom in IndexedDB op dit apparaat: het
// gaat nergens naartoe, en de belofte dat de catalogus het apparaat niet
// verlaat blijft overeind. Op een ander apparaat is het er niet, en dan vraagt
// het scherm er gewoon om.
//
// Eén bestand per account: een volgende catalogus vervangt de vorige.

export interface CatalogFile {
  name: string;
  text: string;
}

const DATABASE = 'acdrs';
const STORE = 'catalog-file';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('geen opslag')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((database) => new Promise<T>((resolve, reject) => {
    const request = work(database.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

/** Bewaren mag mislukken (privévenster, volle schijf): dan vraagt het scherm er later om. */
export async function rememberCatalogFile(owner: string, file: CatalogFile): Promise<void> {
  try { await run('readwrite', (store) => store.put(file, owner)); } catch { /* zie boven */ }
}

export async function recallCatalogFile(owner: string): Promise<CatalogFile | undefined> {
  try {
    const found = await run<CatalogFile | undefined>('readonly', (store) => store.get(owner));
    return found && typeof found.text === 'string' && typeof found.name === 'string' ? found : undefined;
  } catch {
    return undefined;
  }
}

export async function forgetCatalogFile(owner: string): Promise<void> {
  try { await run('readwrite', (store) => store.delete(owner)); } catch { /* zie boven */ }
}
