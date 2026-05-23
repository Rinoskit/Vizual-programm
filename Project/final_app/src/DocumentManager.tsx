import React, { useState, useEffect, useCallback, useRef } from 'react';
import Spreadsheet from './App';
import './DocumentManager.css';
import type { Document, DocumentData } from './types';
import { 
  fetchDocuments, 
  createDocument, 
  renameDocument, 
  deleteDocument, 
  duplicateDocument,
  loadDocumentData,
  saveDocumentData 
} from './api';

interface DocumentManagerProps {
  currentUser: string;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ currentUser }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocRows, setNewDocRows] = useState<number>(50);
  const [newDocCols, setNewDocCols] = useState<number>(26);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentDocData, setCurrentDocData] = useState<DocumentData>({});
  const [currentRows, setCurrentRows] = useState<number>(50);
  const [currentCols, setCurrentCols] = useState<number>(26);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchDocuments(currentUser);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading documents');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreateDocument = async () => {
    if (!newDocName.trim()) {
      setError('Document name is required');
      return;
    }

    try {
      await createDocument({
        name: newDocName,
        user: currentUser,
        rows: newDocRows,
        cols: newDocCols,
        preview: [],
      });
      
      setShowCreateModal(false);
      setNewDocName('');
      setNewDocRows(50);
      setNewDocCols(26);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating document');
    }
  };

  const handleRenameDocument = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await renameDocument(id, newName);
      setRenameDocId(null);
      setRenameName('');
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error renaming document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);
      setDeleteConfirmId(null);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting document');
    }
  };

  const handleDuplicateDocument = async (doc: Document) => {
    try {
      await duplicateDocument(doc, currentUser);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error duplicating document');
    }
  };

  const handleLoadDocument = async (doc: Document) => {
    try {
      const data = await loadDocumentData(doc.id);
      setCurrentDoc(doc);
      setCurrentDocData(data);
      setCurrentRows(doc.rows);
      setCurrentCols(doc.cols);
      setIsDocumentOpen(true);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading document');
    }
  };

  const handleDataChange = useCallback((newData: DocumentData) => {
    if (!currentDoc) return;
    
    setHasUnsavedChanges(true);
    setSaveStatus('saving');
    setCurrentDocData(newData);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDocumentData(currentDoc.id, newData);
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        await loadDocuments();
      } catch (error) {
        setSaveStatus('error');
      }
    }, 500);
  }, [currentDoc, loadDocuments]);

  const handleManualSave = useCallback(async () => {
    if (!currentDoc || !hasUnsavedChanges) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setSaveStatus('saving');
    
    try {
      await saveDocumentData(currentDoc.id, currentDocData);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      await loadDocuments();
    } catch (error) {
      setSaveStatus('error');
    }
  }, [currentDoc, hasUnsavedChanges, currentDocData, loadDocuments]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, handleManualSave]);

  const colToLetter = (col: number): string => {
    return String.fromCharCode(65 + col);
  };

  const getCellAddress = (row: number, col: number): string => {
    return `${colToLetter(col)}${row + 1}`;
  };

  const handleExportCSV = () => {
    const headers = Array.from({ length: currentCols }, (_, i) => colToLetter(i)).join(',');
    let csv = headers + '\n';
    
    for (let row = 0; row < currentRows; row++) {
      const rowData = [];
      for (let col = 0; col < currentCols; col++) {
        const address = getCellAddress(row, col);
        const cell = currentDocData[address];
        let value = cell?.display !== undefined && cell.display !== '' ? cell.display : '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        rowData.push(value);
      }
      csv += rowData.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDoc?.name || 'spreadsheet'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportJSON = () => {
    const data = {
      name: currentDoc?.name,
      rows: currentRows,
      cols: currentCols,
      data: currentDocData,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDoc?.name || 'spreadsheet'}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newData: DocumentData = { ...currentDocData };
      const maxRows = Math.min(1000, lines.length);
      const maxCols = currentCols;
      
      for (let i = 1; i < maxRows; i++) {
        const cells = lines[i].split(',');
        for (let j = 0; j < Math.min(maxCols, cells.length); j++) {
          const address = getCellAddress(i - 1, j);
          let value = cells[j].trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/""/g, '"');
          }
          if (!isNaN(Number(value)) && value !== '') {
            value = Number(value);
          }
          newData[address] = {
            value: value,
            display: value,
            formula: null,
            dependencies: [],
          };
        }
      }
      
      setCurrentDocData(newData);
      handleDataChange(newData);
    };
    reader.readAsText(file);
  };

  if (isDocumentOpen && currentDoc) {
    return (
      <div className="spreadsheet-app">
        <div className="spreadsheet-header">
          <button className="back-btn" onClick={() => setIsDocumentOpen(false)}>
            ← Back to Documents
          </button>
          <div className="doc-info">
            <span className="doc-name">{currentDoc.name}</span>
            <span className={`save-status ${saveStatus}`}>
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'error' && 'Save error'}
            </span>
          </div>
          <div className="export-buttons">
            <button className="export-btn" onClick={handleExportCSV}>CSV</button>
            <button className="export-btn" onClick={handleExportJSON}>JSON</button>
            <label className="import-btn">
              Import CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
            </label>
          </div>
          <button className="save-btn" onClick={handleManualSave}>
            Save (Ctrl+S)
          </button>
        </div>
        <Spreadsheet />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="doc-manager-loading">
        <div className="loader"></div>
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="document-manager">
      <div className="doc-manager-header">
        <h2>My Documents</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Document
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="documents-grid">
        {documents.map((doc) => (
          <div key={doc.id} className="document-card">
            <div className="document-preview" onClick={() => handleLoadDocument(doc)}>
              {doc.preview && doc.preview.length > 0 ? (
                <table className="preview-table">
                  <tbody>
                    {doc.preview.slice(0, 3).map((row, ri) => (
                      <tr key={ri}>
                        {row.slice(0, 3).map((cell, ci) => (
                          <td key={ci} className="preview-cell">{cell || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="preview-empty">Empty</div>
              )}
            </div>
            
            <div className="document-info">
              {renameDocId === doc.id ? (
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onBlur={() => handleRenameDocument(doc.id, renameName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameDocument(doc.id, renameName);
                    if (e.key === 'Escape') setRenameDocId(null);
                  }}
                  className="rename-input"
                  autoFocus
                />
              ) : (
                <div 
                  className="document-name" 
                  onDoubleClick={() => {
                    setRenameDocId(doc.id);
                    setRenameName(doc.name);
                  }}
                >
                  {doc.name}
                </div>
              )}
              <div className="document-meta">
                <span>Created: {new Date(doc.createdAt).toLocaleDateString()}</span>
                <span>Modified: {new Date(doc.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="document-actions">
              <button className="btn-icon" onClick={() => handleDuplicateDocument(doc)} title="Duplicate">
                Copy
              </button>
              <button className="btn-icon" onClick={() => setDeleteConfirmId(doc.id)} title="Delete">
                Delete
              </button>
            </div>

            {deleteConfirmId === doc.id && (
              <div className="confirm-overlay">
                <div className="confirm-dialog">
                  <p>Delete "{doc.name}"?</p>
                  <button onClick={() => handleDeleteDocument(doc.id)}>Yes</button>
                  <button onClick={() => setDeleteConfirmId(null)}>No</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Document</h3>
            <div className="modal-field">
              <label>Document Name</label>
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="My Spreadsheet"
                autoFocus
              />
            </div>
            <div className="modal-field">
              <label>Initial Size</label>
              <div className="size-inputs">
                <input
                  type="number"
                  value={newDocRows}
                  onChange={(e) => setNewDocRows(Math.min(1000, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  min={1}
                  max={1000}
                  placeholder="Rows"
                />
                <span>×</span>
                <input
                  type="number"
                  value={newDocCols}
                  onChange={(e) => setNewDocCols(Math.min(52, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  min={1}
                  max={52}
                  placeholder="Cols"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateDocument}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;