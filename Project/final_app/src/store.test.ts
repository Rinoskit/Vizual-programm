import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

const STORAGE_KEY = 'spreadsheet_documents';
const DATA_KEY = 'spreadsheet_data';

interface CellData {
  value: string | number | boolean;
  display: string | number;
  formula: string | null;
  dependencies: string[];
}

interface Document {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rows: number;
  cols: number;
  preview: string[][];
  user?: string;
}

interface DocumentData {
  [key: string]: CellData;
}

const apiFetchDocuments = async (user: string): Promise<Document[]> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const allDocs: Document[] = stored ? JSON.parse(stored) : [];
  return allDocs.filter(doc => doc.user === user);
};

export const fetchDocuments = createAsyncThunk('documents/fetchDocuments', async (user: string) => {
  return await apiFetchDocuments(user);
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
      const newData = { ...state.history.present };
      newData[address] = {
        value: isNaN(Number(value)) ? value : Number(value),
        display: isNaN(Number(value)) ? value : Number(value),
        formula: value.startsWith('=') ? value : null,
        dependencies: [],
      };
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

const spreadsheetReducer = spreadsheetSlice.reducer;
const documentsReducer = documentsSlice.reducer;
const uiReducer = uiSlice.reducer;
const authReducer = authSlice.reducer;

const spreadsheetActions = spreadsheetSlice.actions;
const documentsActions = documentsSlice.actions;
const uiActions = uiSlice.actions;
const authActions = authSlice.actions;

describe('spreadsheetSlice', () => {
  const initialState = {
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

  it('should return initial state', () => {
    expect(spreadsheetReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setData', () => {
    const newData = { A1: { value: 100, display: 100, formula: null, dependencies: [] } };
    const actual = spreadsheetReducer(initialState, spreadsheetActions.setData(newData));
    expect(actual.data).toEqual(newData);
  });

  it('should handle updateCell', () => {
    const actual = spreadsheetReducer(initialState, spreadsheetActions.updateCell({ address: 'A1', value: '42' }));
    expect(actual.data['A1']?.value).toBe(42);
    expect(actual.history.past.length).toBe(1);
  });

  it('should handle undo', () => {
    let state = spreadsheetReducer(initialState, spreadsheetActions.updateCell({ address: 'A1', value: '42' }));
    state = spreadsheetReducer(state, spreadsheetActions.undo());
    expect(state.data['A1']).toBeUndefined();
  });

  it('should handle redo', () => {
    let state = spreadsheetReducer(initialState, spreadsheetActions.updateCell({ address: 'A1', value: '42' }));
    state = spreadsheetReducer(state, spreadsheetActions.undo());
    state = spreadsheetReducer(state, spreadsheetActions.redo());
    expect(state.data['A1']?.value).toBe(42);
  });

  it('should handle clearHistory', () => {
    let state = spreadsheetReducer(initialState, spreadsheetActions.updateCell({ address: 'A1', value: '42' }));
    state = spreadsheetReducer(state, spreadsheetActions.clearHistory());
    expect(state.history.past.length).toBe(0);
    expect(state.history.future.length).toBe(0);
  });

  it('should handle setSelectedCell', () => {
    const actual = spreadsheetReducer(initialState, spreadsheetActions.setSelectedCell('B2'));
    expect(actual.selectedCell).toBe('B2');
  });

  it('should handle setColWidth', () => {
    const actual = spreadsheetReducer(initialState, spreadsheetActions.setColWidth({ colIndex: 0, width: 150 }));
    expect(actual.colWidths[0]).toBe(150);
  });

  it('should handle setRowHeight', () => {
    const actual = spreadsheetReducer(initialState, spreadsheetActions.setRowHeight({ rowIndex: 0, height: 40 }));
    expect(actual.rowHeights[0]).toBe(40);
  });

  it('should handle setTotalRows', () => {
    const actual = spreadsheetReducer(initialState, spreadsheetActions.setTotalRows(200));
    expect(actual.totalRows).toBe(200);
  });

  it('should handle setTotalCols', () => {
    const actual = spreadsheetReducer(initialState, spreadsheetActions.setTotalCols(52));
    expect(actual.totalCols).toBe(52);
  });
});

describe('documentsSlice', () => {
  const initialState = {
    list: [],
    currentDoc: null,
    currentDocData: {},
    loading: false,
    error: null,
    saveStatus: 'saved',
  };

  it('should return initial state', () => {
    expect(documentsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle fetchDocuments.pending', () => {
    const actual = documentsReducer(initialState, fetchDocuments.pending('', 'user'));
    expect(actual.loading).toBe(true);
  });

  it('should handle fetchDocuments.fulfilled', () => {
    const mockDocs = [{ id: '1', name: 'Test', createdAt: '', updatedAt: '', rows: 10, cols: 5, preview: [] }];
    const actual = documentsReducer(initialState, fetchDocuments.fulfilled(mockDocs, '', 'user'));
    expect(actual.loading).toBe(false);
    expect(actual.list).toEqual(mockDocs);
  });

  it('should handle closeDocument', () => {
    const stateWithDoc = { ...initialState, currentDoc: { id: '1', name: 'Test', createdAt: '', updatedAt: '', rows: 10, cols: 5, preview: [] } };
    const actual = documentsReducer(stateWithDoc, documentsActions.closeDocument());
    expect(actual.currentDoc).toBe(null);
  });

  it('should handle setSaveStatus', () => {
    const actual = documentsReducer(initialState, documentsActions.setSaveStatus('saving'));
    expect(actual.saveStatus).toBe('saving');
  });
});

describe('uiSlice', () => {
  const initialState = {
    showCreateModal: false,
    isDocumentOpen: false,
    hasUnsavedChanges: false,
  };

  it('should return initial state', () => {
    expect(uiReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setShowCreateModal', () => {
    const actual = uiReducer(initialState, uiActions.setShowCreateModal(true));
    expect(actual.showCreateModal).toBe(true);
  });

  it('should handle setIsDocumentOpen', () => {
    const actual = uiReducer(initialState, uiActions.setIsDocumentOpen(true));
    expect(actual.isDocumentOpen).toBe(true);
  });

  it('should handle setHasUnsavedChanges', () => {
    const actual = uiReducer(initialState, uiActions.setHasUnsavedChanges(true));
    expect(actual.hasUnsavedChanges).toBe(true);
  });
});

describe('authSlice', () => {
  const initialState = {
    user: { id: '1', email: 'user@example.com', name: 'User' },
  };

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setUser', () => {
    const newUser = { id: '2', email: 'new@test.com', name: 'New User' };
    const actual = authReducer(initialState, authActions.setUser(newUser));
    expect(actual.user).toEqual(newUser);
  });

  it('should handle logout', () => {
    const actual = authReducer(initialState, authActions.logout());
    expect(actual.user).toBe(null);
  });
});