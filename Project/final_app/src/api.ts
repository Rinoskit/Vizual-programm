import type { Document, DocumentData } from './types';

const STORAGE_KEY = 'spreadsheet_documents';
const DATA_KEY = 'spreadsheet_data';

export const fetchDocuments = async (user: string): Promise<Document[]> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const allDocs: Document[] = stored ? JSON.parse(stored) : [];
  return allDocs.filter(doc => doc.user === user);
};

export const createDocument = async (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> => {
  const newDoc: Document = {
    ...doc,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preview: [],
  };

  const stored = localStorage.getItem(STORAGE_KEY);
  const docs: Document[] = stored ? JSON.parse(stored) : [];
  docs.push(newDoc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));

  const allData = localStorage.getItem(DATA_KEY);
  const dataMap = allData ? JSON.parse(allData) : {};
  dataMap[newDoc.id] = {};
  localStorage.setItem(DATA_KEY, JSON.stringify(dataMap));

  return newDoc;
};

export const loadDocumentData = async (id: string): Promise<DocumentData> => {
  const stored = localStorage.getItem(DATA_KEY);
  const dataMap = stored ? JSON.parse(stored) : {};
  return dataMap[id] || {};
};

export const saveDocumentData = async (id: string, data: DocumentData): Promise<void> => {
  const stored = localStorage.getItem(DATA_KEY);
  const dataMap = stored ? JSON.parse(stored) : {};
  dataMap[id] = data;
  localStorage.setItem(DATA_KEY, JSON.stringify(dataMap));

  const docsStored = localStorage.getItem(STORAGE_KEY);
  const docs: Document[] = docsStored ? JSON.parse(docsStored) : [];
  const docIndex = docs.findIndex(d => d.id === id);
  if (docIndex !== -1) {
    docs[docIndex].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }
};

export const renameDocument = async (id: string, newName: string): Promise<void> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const docs: Document[] = stored ? JSON.parse(stored) : [];
  const doc = docs.find(d => d.id === id);
  if (doc) {
    doc.name = newName;
    doc.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }
};

export const deleteDocument = async (id: string): Promise<void> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  let docs: Document[] = stored ? JSON.parse(stored) : [];
  docs = docs.filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));

  const dataStored = localStorage.getItem(DATA_KEY);
  const dataMap = dataStored ? JSON.parse(dataStored) : {};
  delete dataMap[id];
  localStorage.setItem(DATA_KEY, JSON.stringify(dataMap));
};

export const duplicateDocument = async (doc: Document, user: string): Promise<Document> => {
  const data = await loadDocumentData(doc.id);
  const newDoc = await createDocument({
    name: `${doc.name} (copy)`,
    user,
    rows: doc.rows,
    cols: doc.cols,
    preview: doc.preview,
  });
  await saveDocumentData(newDoc.id, data);
  return newDoc;
};