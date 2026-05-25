import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

const STORAGE_KEY = 'spreadsheet_documents';
const DATA_KEY = 'spreadsheet_data';

export interface Document {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rows: number;
  cols: number;
  preview: string[][];
  user?: string;
}

export interface CellData {
  value: string | number | boolean;
  display: string | number;
  formula: string | null;
  dependencies: string[];
}

export interface DocumentData {
  [key: string]: CellData;
}

const apiFetchDocuments = async (user: string): Promise<Document[]> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const allDocs: Document[] = stored ? JSON.parse(stored) : [];
  return allDocs.filter(doc => doc.user === user);
};

const apiCreateDocument = async (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> => {
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

const apiLoadDocumentData = async (id: string): Promise<DocumentData> => {
  const stored = localStorage.getItem(DATA_KEY);
  const dataMap = stored ? JSON.parse(stored) : {};
  return dataMap[id] || {};
};

const apiSaveDocumentData = async (id: string, data: DocumentData): Promise<void> => {
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

const apiRenameDocument = async (id: string, newName: string): Promise<void> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const docs: Document[] = stored ? JSON.parse(stored) : [];
  const doc = docs.find(d => d.id === id);
  if (doc) {
    doc.name = newName;
    doc.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }
};

const apiDeleteDocument = async (id: string): Promise<void> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  let docs: Document[] = stored ? JSON.parse(stored) : [];
  docs = docs.filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  const dataStored = localStorage.getItem(DATA_KEY);
  const dataMap = dataStored ? JSON.parse(dataStored) : {};
  delete dataMap[id];
  localStorage.setItem(DATA_KEY, JSON.stringify(dataMap));
};

const apiDuplicateDocument = async (doc: Document, user: string): Promise<Document> => {
  const data = await apiLoadDocumentData(doc.id);
  const newDoc = await apiCreateDocument({
    name: `${doc.name} (copy)`,
    user,
    rows: doc.rows,
    cols: doc.cols,
    preview: doc.preview,
  });
  await apiSaveDocumentData(newDoc.id, data);
  return newDoc;
};

export const fetchDocuments = createAsyncThunk('documents/fetchDocuments', async (user: string) => {
  return await apiFetchDocuments(user);
});

export const createDocument = createAsyncThunk('documents/createDocument', async (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => {
  return await apiCreateDocument(doc);
});

export const renameDocument = createAsyncThunk('documents/renameDocument', async ({ id, newName }: { id: string; newName: string }) => {
  await apiRenameDocument(id, newName);
  return { id, newName };
});

export const deleteDocument = createAsyncThunk('documents/deleteDocument', async (id: string) => {
  await apiDeleteDocument(id);
  return id;
});

export const duplicateDocument = createAsyncThunk('documents/duplicateDocument', async ({ doc, user }: { doc: Document; user: string }) => {
  return await apiDuplicateDocument(doc, user);
});

export const loadDocument = createAsyncThunk('documents/loadDocument', async (doc: Document) => {
  const data = await apiLoadDocumentData(doc.id);
  return { doc, data };
});

export const saveDocumentData = createAsyncThunk('documents/saveDocumentData', async ({ id, data }: { id: string; data: DocumentData }) => {
  await apiSaveDocumentData(id, data);
  return { id, data };
});

interface HistoryState {
  past: DocumentData[];
  present: DocumentData;
  future: DocumentData[];
}

interface SpreadsheetState {
  data: DocumentData;
  selectedCell: string | null;
  selectionStart: string | null;
  selectedRange: string[];
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  totalRows: number;
  totalCols: number;
  history: HistoryState;
}

const initialSpreadsheetState: SpreadsheetState = {
  data: {},
  selectedCell: null,
  selectionStart: null,
  selectedRange: [],
  colWidths: {},
  rowHeights: {},
  totalRows: 100,
  totalCols: 26,
  history: {
    past: [],
    present: {},
    future: [],
  },
};

const spreadsheetSlice = createSlice({
  name: 'spreadsheet',
  initialState: initialSpreadsheetState,
  reducers: {
    setData: (state, action: PayloadAction<DocumentData>) => {
      state.data = action.payload;
      state.history.present = action.payload;
    },
    updateCell: (state, action: PayloadAction<{ address: string; value: string }>) => {
      const { address, value } = action.payload;
      const isFormula = value.startsWith('=');
      let isBool = false;
      let boolValue = false;
      
      if (value.toLowerCase() === 'true') {
        isBool = true;
        boolValue = true;
      } else if (value.toLowerCase() === 'false') {
        isBool = true;
        boolValue = false;
      }
      
      const newData = { ...state.history.present };
      
      if (isFormula) {
        newData[address] = {
          value: value,
          display: value,
          formula: value,
          dependencies: [],
        };
      } else if (isBool) {
        newData[address] = {
          value: boolValue,
          display: boolValue ? 'true' : 'false',
          formula: null,
          dependencies: [],
        };
      } else {
        const numValue = Number(value);
        const isNumber = !isNaN(numValue) && value.trim() !== '';
        newData[address] = {
          value: isNumber ? numValue : value,
          display: isNumber ? numValue : value,
          formula: null,
          dependencies: [],
        };
      }
      
      state.history.past.push(state.history.present);
      state.history.present = newData;
      state.history.future = [];
      state.data = newData;
    },
    undo: (state) => {
      if (state.history.past.length === 0) return;
      const previous = state.history.past.pop()!;
      state.history.future.push(state.history.present);
      state.history.present = previous;
      state.data = previous;
    },
    redo: (state) => {
      if (state.history.future.length === 0) return;
      const next = state.history.future.pop()!;
      state.history.past.push(state.history.present);
      state.history.present = next;
      state.data = next;
    },
    clearHistory: (state) => {
      state.history.past = [];
      state.history.future = [];
    },
    setSelectedCell: (state, action: PayloadAction<string | null>) => {
      state.selectedCell = action.payload;
    },
    setSelectionStart: (state, action: PayloadAction<string | null>) => {
      state.selectionStart = action.payload;
    },
    setSelectedRange: (state, action: PayloadAction<string[]>) => {
      state.selectedRange = action.payload;
    },
    setColWidth: (state, action: PayloadAction<{ colIndex: number; width: number }>) => {
      state.colWidths[action.payload.colIndex] = action.payload.width;
    },
    setRowHeight: (state, action: PayloadAction<{ rowIndex: number; height: number }>) => {
      state.rowHeights[action.payload.rowIndex] = action.payload.height;
    },
    setTotalRows: (state, action: PayloadAction<number>) => {
      state.totalRows = action.payload;
    },
    setTotalCols: (state, action: PayloadAction<number>) => {
      state.totalCols = action.payload;
    },
  },
});

interface DocumentsState {
  list: Document[];
  currentDoc: Document | null;
  currentDocData: DocumentData;
  loading: boolean;
  error: string | null;
  saveStatus: 'saved' | 'saving' | 'error';
}

const initialDocumentsState: DocumentsState = {
  list: [],
  currentDoc: null,
  currentDocData: {},
  loading: false,
  error: null,
  saveStatus: 'saved',
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState: initialDocumentsState,
  reducers: {
    closeDocument: (state) => {
      state.currentDoc = null;
      state.currentDocData = {};
    },
    setSaveStatus: (state, action: PayloadAction<'saved' | 'saving' | 'error'>) => {
      state.saveStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch documents';
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(renameDocument.fulfilled, (state, action) => {
        const doc = state.list.find(d => d.id === action.payload.id);
        if (doc) {
          doc.name = action.payload.newName;
          doc.updatedAt = new Date().toISOString();
        }
        if (state.currentDoc?.id === action.payload.id) {
          state.currentDoc.name = action.payload.newName;
        }
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.list = state.list.filter(d => d.id !== action.payload);
        if (state.currentDoc?.id === action.payload) {
          state.currentDoc = null;
          state.currentDocData = {};
        }
      })
      .addCase(duplicateDocument.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(loadDocument.fulfilled, (state, action) => {
        state.currentDoc = action.payload.doc;
        state.currentDocData = action.payload.data;
        state.saveStatus = 'saved';
      })
      .addCase(saveDocumentData.pending, (state) => {
        state.saveStatus = 'saving';
      })
      .addCase(saveDocumentData.fulfilled, (state) => {
        state.saveStatus = 'saved';
        if (state.currentDoc) {
          state.currentDoc.updatedAt = new Date().toISOString();
          const doc = state.list.find(d => d.id === state.currentDoc?.id);
          if (doc) {
            doc.updatedAt = new Date().toISOString();
          }
        }
      })
      .addCase(saveDocumentData.rejected, (state) => {
        state.saveStatus = 'error';
      });
  },
});

interface UiState {
  showCreateModal: boolean;
  isDocumentOpen: boolean;
  hasUnsavedChanges: boolean;
}

const initialUiState: UiState = {
  showCreateModal: false,
  isDocumentOpen: false,
  hasUnsavedChanges: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    setShowCreateModal: (state, action: PayloadAction<boolean>) => {
      state.showCreateModal = action.payload;
    },
    setIsDocumentOpen: (state, action: PayloadAction<boolean>) => {
      state.isDocumentOpen = action.payload;
    },
    setHasUnsavedChanges: (state, action: PayloadAction<boolean>) => {
      state.hasUnsavedChanges = action.payload;
    },
  },
});

interface AuthState {
  user: { id: string; email: string; name: string } | null;
}

const initialAuthState: AuthState = {
  user: { id: '1', email: 'user@example.com', name: 'User' },
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    setUser: (state, action: PayloadAction<{ id: string; email: string; name: string } | null>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
    },
  },
});

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const autoSaveMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);
  const state = store.getState();
  
  if (action.type?.startsWith('spreadsheet/') && action.type !== 'spreadsheet/setData') {
    if (state.documents.currentDoc && state.spreadsheet.data !== state.documents.currentDocData) {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        store.dispatch(saveDocumentData({
          id: state.documents.currentDoc.id,
          data: state.spreadsheet.data,
        }));
        store.dispatch(uiSlice.actions.setHasUnsavedChanges(false));
      }, 500);
      store.dispatch(uiSlice.actions.setHasUnsavedChanges(true));
    }
  }
  
  if (action.type === 'documents/loadDocument/fulfilled') {
    store.dispatch(spreadsheetSlice.actions.setData(action.payload.data));
    store.dispatch(spreadsheetSlice.actions.setTotalRows(action.payload.doc.rows));
    store.dispatch(spreadsheetSlice.actions.setTotalCols(action.payload.doc.cols));
    store.dispatch(spreadsheetSlice.actions.clearHistory());
  }
  
  if (action.type === 'documents/saveDocumentData/fulfilled') {
    store.dispatch(uiSlice.actions.setHasUnsavedChanges(false));
  }
  
  return result;
};

export const store = configureStore({
  reducer: {
    spreadsheet: spreadsheetSlice.reducer,
    documents: documentsSlice.reducer,
    ui: uiSlice.reducer,
    auth: authSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(autoSaveMiddleware),
});

export const spreadsheetActions = spreadsheetSlice.actions;
export const documentsActions = { ...documentsSlice.actions, fetchDocuments, createDocument, renameDocument, deleteDocument, duplicateDocument, loadDocument, saveDocumentData };
export const uiActions = uiSlice.actions;
export const authActions = authSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;