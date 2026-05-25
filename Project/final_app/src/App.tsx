// src/App.tsx
import React, { useState, useCallback, useEffect, useRef, memo, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation, Outlet } from 'react-router-dom';
import { mockAuth, type User } from './auth';
import './App.css';

interface CellData {
  value: string | number | boolean;
  display: string | number;
  formula: string | null;
  dependencies: string[];
  styles?: CellStyles;
}

interface CellStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  bgColor?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'number' | 'percent' | 'currency' | 'date';
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

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, redirect?: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const STORAGE_KEY = 'spreadsheet_documents';
const DATA_KEY = 'spreadsheet_data';

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

const colToLetter = (col: number): string => String.fromCharCode(65 + col);
const letterToCol = (letter: string): number => letter.charCodeAt(0) - 65;
const getCellAddress = (row: number, col: number): string => `${colToLetter(col)}${row + 1}`;

const getCellPosition = (address: string): { row: number; col: number } => {
  const match = address.match(/([A-Z]+)(\d+)/);
  if (!match) throw new Error(`Invalid address: ${address}`);
  return { col: letterToCol(match[1]), row: parseInt(match[2]) - 1 };
};

const getRangeCells = (start: string, end: string): string[] => {
  const startPos = getCellPosition(start);
  const endPos = getCellPosition(end);
  const cells: string[] = [];
  const minRow = Math.min(startPos.row, endPos.row);
  const maxRow = Math.max(startPos.row, endPos.row);
  const minCol = Math.min(startPos.col, endPos.col);
  const maxCol = Math.max(startPos.col, endPos.col);
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      cells.push(getCellAddress(row, col));
    }
  }
  return cells;
};

const getCellReferences = (expression: string): string[] => {
  const regex = /[A-Z]+\d+/g;
  const matches = expression.match(regex);
  return matches ? [...new Set(matches)] : [];
};

const evaluateSUM = (range: string, data: Record<string, CellData>): number => {
  const [start, end] = range.split(':');
  const cells = getRangeCells(start, end);
  let sum = 0;
  for (const cell of cells) {
    const value = data[cell]?.display;
    if (typeof value === 'number') sum += value;
    else if (typeof value === 'string' && !isNaN(Number(value))) sum += Number(value);
  }
  return sum;
};

const evaluateAVERAGE = (range: string, data: Record<string, CellData>): number => {
  const [start, end] = range.split(':');
  const cells = getRangeCells(start, end);
  let sum = 0;
  let count = 0;
  for (const cell of cells) {
    const value = data[cell]?.display;
    if (typeof value === 'number') {
      sum += value;
      count++;
    } else if (typeof value === 'string' && !isNaN(Number(value))) {
      sum += Number(value);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
};

const formatValue = (value: any, format?: string): string => {
  if (typeof value !== 'number') return String(value);
  switch (format) {
    case 'percent': return `${Math.round(value * 100)}%`;
    case 'currency': return `$${value.toFixed(2)}`;
    case 'date': return new Date(value).toLocaleDateString();
    default: return String(value);
  }
};

const evaluateFormula = (formula: string, data: Record<string, CellData>): string | number => {
  if (!formula.startsWith('=')) return formula;
  let expression = formula.slice(1);
  
  const sumMatch = expression.match(/SUM\(([A-Z]+\d+:[A-Z]+\d+)\)/i);
  if (sumMatch) {
    const result = evaluateSUM(sumMatch[1], data);
    expression = expression.replace(sumMatch[0], result.toString());
  }
  
  const avgMatch = expression.match(/AVERAGE\(([A-Z]+\d+:[A-Z]+\d+)\)/i);
  if (avgMatch) {
    const result = evaluateAVERAGE(avgMatch[1], data);
    expression = expression.replace(avgMatch[0], result.toString());
  }
  
  const cellRefs = getCellReferences(expression);
  for (const cellRef of cellRefs) {
    const cellValue = data[cellRef]?.display;
    let valueToUse = 0;
    if (typeof cellValue === 'number') valueToUse = cellValue;
    else if (typeof cellValue === 'string' && !isNaN(Number(cellValue))) valueToUse = Number(cellValue);
    else if (typeof cellValue === 'boolean') valueToUse = cellValue ? 1 : 0;
    expression = expression.replace(new RegExp(cellRef, 'g'), valueToUse.toString());
  }
  
  try {
    const result = Function('"use strict";return (' + expression + ')')();
    return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
  } catch (error) {
    return '#ОШИБКА!';
  }
};

const getFormulaDependencies = (formula: string): string[] => {
  if (!formula.startsWith('=')) return [];
  let expression = formula.slice(1);
  const dependencies: string[] = [];
  
  const rangeMatch = expression.match(/(?:SUM|AVERAGE)\(([A-Z]+\d+:[A-Z]+\d+)\)/i);
  if (rangeMatch) {
    const [start, end] = rangeMatch[1].split(':');
    const cells = getRangeCells(start, end);
    dependencies.push(...cells);
    expression = expression.replace(rangeMatch[0], '');
  }
  
  const directRefs = getCellReferences(expression);
  dependencies.push(...directRefs);
  return [...new Set(dependencies)];
};

interface CellProps {
  address: string;
  value: any;
  isSelected: boolean;
  isInRange: boolean;
  onUpdate: (address: string, value: string) => void;
  onClick: (e: React.MouseEvent) => void;
  rowHeight: number;
}

const Cell = memo<CellProps>(({ address, value, isSelected, isInRange, onUpdate, onClick, rowHeight }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  let cellClass = 'cell';
  if (isSelected) cellClass += ' selected';
  if (isInRange && !isSelected) cellClass += ' in-range';
  
  const handleDoubleClick = () => {
    setIsEditing(true);
    const val = value !== undefined && value !== null ? value : '';
    setEditValue(String(val));
  };
  
  const handleSave = () => {
    setIsEditing(false);
    onUpdate(address, editValue);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (isSelected && !isEditing && e.key === 'Enter') {
        setIsEditing(true);
        const val = value !== undefined && value !== null ? value : '';
        setEditValue(String(val));
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [isSelected, isEditing, value]);
  
  if (isEditing) {
    return (
      <div className={cellClass} style={{ height: rowHeight }}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="cell-editor"
        />
      </div>
    );
  }
  
  let displayValue = value;
  if (typeof value === 'boolean') {
    displayValue = value ? 'true' : 'false';
  }
  
  return (
    <div className={cellClass} style={{ height: rowHeight }} onClick={onClick} onDoubleClick={handleDoubleClick}>
      {displayValue !== undefined && displayValue !== null && displayValue !== '' ? displayValue : ''}
    </div>
  );
});

Cell.displayName = 'Cell';

interface FormulaBarProps {
  selectedCell: string | null;
  value: string;
  onUpdate: (value: string) => void;
}

const FormulaBar: React.FC<FormulaBarProps> = ({ selectedCell, value, onUpdate }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };
  
  return (
    <div className="formula-bar">
      <div className="formula-bar-address">{selectedCell || '—'}</div>
      <div className="formula-bar-input-wrapper">
        <span className="formula-icon">fx</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onUpdate(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите значение или формулу (начинается с =)..."
          className="formula-bar-input"
        />
      </div>
    </div>
  );
};

interface ContextMenuProps {
  x: number;
  y: number;
  type: 'row' | 'col';
  index: number;
  onAdd: (type: 'row' | 'col', index: number) => void;
  onDelete: (type: 'row' | 'col', index: number) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, type, index, onAdd, onDelete, onClose }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);
  
  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      <button onClick={() => { onAdd(type, index); onClose(); }}>Вставить {type === 'row' ? 'строку' : 'столбец'}</button>
      <button onClick={() => { onDelete(type, index); onClose(); }}>Удалить {type === 'row' ? 'строку' : 'столбец'}</button>
    </div>
  );
};

const Toolbar: React.FC<{ selectedCell: string | null; onStyleChange: (styles: Partial<CellStyles>) => void; currentStyles: CellStyles }> = ({ selectedCell, onStyleChange, currentStyles }) => {
  return (
    <div className="toolbar">
      <button onClick={() => onStyleChange({ bold: !currentStyles.bold })} className={currentStyles.bold ? 'active' : ''}>B</button>
      <button onClick={() => onStyleChange({ italic: !currentStyles.italic })} className={currentStyles.italic ? 'active' : ''}>I</button>
      <button onClick={() => onStyleChange({ underline: !currentStyles.underline })} className={currentStyles.underline ? 'active' : ''}>U</button>
      <select value={currentStyles.align || 'left'} onChange={(e) => onStyleChange({ align: e.target.value as 'left' | 'center' | 'right' })}>
        <option value="left">По левому краю</option>
        <option value="center">По центру</option>
        <option value="right">По правому краю</option>
      </select>
      <select value={currentStyles.format || 'number'} onChange={(e) => onStyleChange({ format: e.target.value as 'number' | 'percent' | 'currency' | 'date' })}>
        <option value="number">Число</option>
        <option value="percent">Процент</option>
        <option value="currency">Валюта</option>
        <option value="date">Дата</option>
      </select>
      <input type="color" value={currentStyles.bgColor || '#ffffff'} onChange={(e) => onStyleChange({ bgColor: e.target.value })} title="Цвет фона" />
      <input type="color" value={currentStyles.textColor || '#000000'} onChange={(e) => onStyleChange({ textColor: e.target.value })} title="Цвет текста" />
    </div>
  );
};

const SpreadsheetEditor: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  
  const TOTAL_COLS = 26;
  const TOTAL_ROWS = 100;
  const DEFAULT_COL_WIDTH = 100;
  const DEFAULT_ROW_HEIGHT = 32;
  
  const [data, setData] = useState<Record<string, DocumentData>>({});
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; type: 'row' | 'col'; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clipboardData, setClipboardData] = useState<{ address: string; value: any; styles?: CellStyles }[]>([]);
  const [clipboardMode, setClipboardMode] = useState<'copy' | 'cut' | null>(null);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [exportMenu, setExportMenu] = useState<string | null>(null);
  const user = mockAuth.getUser();
  const userId = user?.email;
  
  const getColWidth = (colIndex: number): number => colWidths[colIndex] || DEFAULT_COL_WIDTH;
  const getRowHeight = (rowIndex: number): number => rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT;
  
  useEffect(() => {
    if (documentId && userId) {
      apiLoadDocumentData(documentId).then(docData => {
        setData(prev => ({ ...prev, [documentId]: docData }));
        const docsStored = localStorage.getItem(STORAGE_KEY);
        const allDocs: Document[] = docsStored ? JSON.parse(docsStored) : [];
        const doc = allDocs.find(d => d.id === documentId);
        if (doc && doc.user === userId) {
          setCurrentDoc(doc);
          setLoading(false);
        } else {
          navigate('/dashboard');
        }
      }).catch(() => {
        navigate('/404');
      });
    } else {
      navigate('/dashboard');
    }
  }, [documentId, userId, navigate]);
  
  const recalcAllFormulas = useCallback((docId: string) => {
    setData(prevData => {
      const docData = prevData[docId] || {};
      const newData = { ...docData };
      let changed = true;
      let iterations = 0;
      const maxIterations = 100;
      
      while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        
        for (const [address, cellData] of Object.entries(newData)) {
          if (cellData.formula) {
            const oldDisplay = cellData.display;
            const newDisplay = evaluateFormula(cellData.formula, newData);
            if (oldDisplay !== newDisplay) {
              newData[address] = { ...cellData, display: newDisplay };
              changed = true;
            }
          }
        }
      }
      
      return { ...prevData, [docId]: newData };
    });
  }, []);
  
  const updateCell = useCallback((docId: string, address: string, rawValue: string) => {
    const isFormula = rawValue.startsWith('=');
    let isBool = false;
    let boolValue = false;
    
    if (rawValue.toLowerCase() === 'true') {
      isBool = true;
      boolValue = true;
    } else if (rawValue.toLowerCase() === 'false') {
      isBool = true;
      boolValue = false;
    }
    
    setData(prev => {
      const docData = prev[docId] || {};
      const newDocData = { ...docData };
      const existingStyles = newDocData[address]?.styles || {};
      
      if (isFormula) {
        const dependencies = getFormulaDependencies(rawValue);
        const result = evaluateFormula(rawValue, newDocData);
        newDocData[address] = { 
          value: rawValue, 
          display: result, 
          formula: rawValue, 
          dependencies,
          styles: existingStyles
        };
      } else if (isBool) {
        newDocData[address] = { 
          value: boolValue, 
          display: boolValue ? 'true' : 'false', 
          formula: null, 
          dependencies: [],
          styles: existingStyles
        };
      } else {
        const numValue = Number(rawValue);
        const isNumber = !isNaN(numValue) && rawValue.trim() !== '';
        newDocData[address] = { 
          value: isNumber ? numValue : rawValue, 
          display: isNumber ? numValue : rawValue, 
          formula: null, 
          dependencies: [],
          styles: existingStyles
        };
      }
      
      return { ...prev, [docId]: newDocData };
    });
    
    setHasUnsavedChanges(true);
    setSaveStatus('saving');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (currentDoc) {
        const currentData = data[currentDoc.id] || {};
        await apiSaveDocumentData(currentDoc.id, currentData);
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
      }
      if (docId) recalcAllFormulas(docId);
    }, 500);
  }, [currentDoc, data, recalcAllFormulas]);
  
  const updateCellStyles = useCallback((docId: string, address: string, styles: Partial<CellStyles>) => {
    setData(prev => {
      const docData = prev[docId] || {};
      const newDocData = { ...docData };
      const existing = newDocData[address] || { value: '', display: '', formula: null, dependencies: [] };
      newDocData[address] = { ...existing, styles: { ...existing.styles, ...styles } };
      return { ...prev, [docId]: newDocData };
    });
    setHasUnsavedChanges(true);
    setSaveStatus('saving');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (currentDoc) {
        const currentData = data[currentDoc.id] || {};
        await apiSaveDocumentData(currentDoc.id, currentData);
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
      }
    }, 500);
  }, [currentDoc, data]);
  
  const getCurrentStyles = (): CellStyles => {
    if (!selectedCell || !currentDoc) return {};
    const docData = data[currentDoc.id] || {};
    const cell = docData[selectedCell];
    return cell?.styles || {};
  };
  
  const getCellDisplay = (docId: string, row: number, col: number): any => {
    const docData = data[docId] || {};
    const address = getCellAddress(row, col);
    const cell = docData[address];
    let value = cell?.display !== undefined && cell.display !== '' ? cell.display : cell?.value || '';
    if (cell?.styles?.format && typeof value === 'number') {
      value = formatValue(value, cell.styles.format);
    }
    return value;
  };
  
  const getCellStyle = (docId: string, address: string): React.CSSProperties => {
    const docData = data[docId] || {};
    const cell = docData[address];
    const styles: React.CSSProperties = {};
    if (cell?.styles?.bold) styles.fontWeight = 'bold';
    if (cell?.styles?.italic) styles.fontStyle = 'italic';
    if (cell?.styles?.underline) styles.textDecoration = 'underline';
    if (cell?.styles?.align) styles.textAlign = cell.styles.align;
    if (cell?.styles?.bgColor) styles.backgroundColor = cell.styles.bgColor;
    if (cell?.styles?.textColor) styles.color = cell.styles.textColor;
    return styles;
  };
  
  const getFormulaBarValue = (): string => {
    if (!selectedCell || !currentDoc) return '';
    const docData = data[currentDoc.id] || {};
    const cell = docData[selectedCell];
    if (cell?.formula) return cell.formula;
    if (cell?.value !== undefined && cell.value !== '') {
      if (typeof cell.value === 'boolean') return cell.value ? 'true' : 'false';
      return String(cell.value);
    }
    return '';
  };
  
  const isInRange = (address: string): boolean => selectedRange.includes(address);
  
  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    const address = getCellAddress(row, col);
    if (event.shiftKey && selectionStart) {
      const range = getRangeCells(selectionStart, address);
      setSelectedRange(range);
      setSelectedCell(address);
    } else {
      setSelectionStart(address);
      setSelectedRange([address]);
      setSelectedCell(address);
    }
  };
  
  const updateFromFormulaBar = (value: string) => {
    if (selectedCell && currentDoc) updateCell(currentDoc.id, selectedCell, value);
  };
  
  const addRow = (docId: string, afterRowIndex: number) => {
    setData(prev => {
      const docData = prev[docId] || {};
      const newRowIndex = afterRowIndex + 1;
      const shiftedData: DocumentData = {};
      
      for (const [address, cellData] of Object.entries(docData)) {
        const match = address.match(/([A-Z]+)(\d+)/);
        if (match) {
          const col = match[1];
          const row = parseInt(match[2]);
          if (row >= newRowIndex) {
            shiftedData[`${col}${row + 1}`] = cellData;
          } else {
            shiftedData[address] = cellData;
          }
        }
      }
      
      return { ...prev, [docId]: shiftedData };
    });
  };
  
  const deleteRow = (docId: string, rowIndex: number) => {
    setData(prev => {
      const docData = prev[docId] || {};
      const newData: DocumentData = {};
      for (const [address, cellData] of Object.entries(docData)) {
        const match = address.match(/([A-Z]+)(\d+)/);
        if (match) {
          const col = match[1];
          const row = parseInt(match[2]);
          if (row === rowIndex + 1) continue;
          if (row > rowIndex + 1) {
            newData[`${col}${row - 1}`] = cellData;
          } else {
            newData[address] = cellData;
          }
        }
      }
      return { ...prev, [docId]: newData };
    });
  };
  
  const addColumn = (docId: string, afterColIndex: number) => {
    setData(prev => {
      const docData = prev[docId] || {};
      const newColIndex = afterColIndex + 1;
      const newData: DocumentData = {};
      
      for (const [address, cellData] of Object.entries(docData)) {
        const match = address.match(/([A-Z]+)(\d+)/);
        if (match) {
          const colLetter = match[1];
          const row = match[2];
          const colIndex = letterToCol(colLetter);
          if (colIndex >= newColIndex) {
            const newColLetter = colToLetter(colIndex + 1);
            newData[`${newColLetter}${row}`] = cellData;
          } else {
            newData[address] = cellData;
          }
        }
      }
      return { ...prev, [docId]: newData };
    });
  };
  
  const deleteColumn = (docId: string, colIndex: number) => {
    setData(prev => {
      const docData = prev[docId] || {};
      const newData: DocumentData = {};
      for (const [address, cellData] of Object.entries(docData)) {
        const match = address.match(/([A-Z]+)(\d+)/);
        if (match) {
          const colLetter = match[1];
          const row = match[2];
          const col = letterToCol(colLetter);
          if (col === colIndex) continue;
          if (col > colIndex) {
            const newColLetter = colToLetter(col - 1);
            newData[`${newColLetter}${row}`] = cellData;
          } else {
            newData[address] = cellData;
          }
        }
      }
      return { ...prev, [docId]: newData };
    });
  };
  
  const handleResizeCol = (colIndex: number, newWidth: number) => {
    setColWidths(prev => ({ ...prev, [colIndex]: newWidth }));
  };
  
  const handleResizeRow = (rowIndex: number, newHeight: number) => {
    setRowHeights(prev => ({ ...prev, [rowIndex]: newHeight }));
  };
  
  const handleCopy = useCallback(() => {
    if (selectedRange.length === 0 || !currentDoc) return;
    const docData = data[currentDoc.id] || {};
    const copyData = selectedRange.map(address => ({
      address,
      value: docData[address]?.value || '',
      styles: docData[address]?.styles
    }));
    setClipboardData(copyData);
    setClipboardMode('copy');
  }, [selectedRange, data, currentDoc]);
  
  const handleCut = useCallback(() => {
    if (selectedRange.length === 0 || !currentDoc) return;
    const docData = data[currentDoc.id] || {};
    const cutData = selectedRange.map(address => ({
      address,
      value: docData[address]?.value || '',
      styles: docData[address]?.styles
    }));
    setClipboardData(cutData);
    setClipboardMode('cut');
    selectedRange.forEach(address => {
      updateCell(currentDoc.id, address, '');
    });
  }, [selectedRange, data, currentDoc, updateCell]);
  
  const handlePaste = useCallback(() => {
    if (clipboardData.length === 0 || !currentDoc) return;
    const startAddress = selectedRange[0];
    if (!startAddress) return;
    const startPos = getCellPosition(startAddress);
    clipboardData.forEach((item, index) => {
      const targetRow = startPos.row + index;
      const targetCol = startPos.col;
      const targetAddress = getCellAddress(targetRow, targetCol);
      updateCell(currentDoc.id, targetAddress, String(item.value));
      if (item.styles) {
        updateCellStyles(currentDoc.id, targetAddress, item.styles);
      }
    });
    if (clipboardMode === 'cut') {
      setClipboardData([]);
      setClipboardMode(null);
    }
  }, [clipboardData, clipboardMode, selectedRange, currentDoc, updateCell, updateCellStyles]);
  
  const handleSelectAll = useCallback(() => {
    const allCells: string[] = [];
    for (let row = 0; row < TOTAL_ROWS; row++) {
      for (let col = 0; col < TOTAL_COLS; col++) {
        allCells.push(getCellAddress(row, col));
      }
    }
    setSelectedRange(allCells);
    setSelectedCell(allCells[0]);
  }, [TOTAL_ROWS, TOTAL_COLS]);
  
  const handleClearCell = useCallback(() => {
    if (selectedRange.length === 0 || !currentDoc) return;
    selectedRange.forEach(address => {
      updateCell(currentDoc.id, address, '');
    });
  }, [selectedRange, currentDoc, updateCell]);
  
  const handleStyleChange = (styles: Partial<CellStyles>) => {
    if (selectedCell && currentDoc) {
      updateCellStyles(currentDoc.id, selectedCell, styles);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (selectedCell && currentDoc) {
          const currentStyles = getCurrentStyles();
          updateCellStyles(currentDoc.id, selectedCell, { bold: !currentStyles.bold });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        if (selectedCell && currentDoc) {
          const currentStyles = getCurrentStyles();
          updateCellStyles(currentDoc.id, selectedCell, { italic: !currentStyles.italic });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        if (selectedCell && currentDoc) {
          const currentStyles = getCurrentStyles();
          updateCellStyles(currentDoc.id, selectedCell, { underline: !currentStyles.underline });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleClearCell();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedCell) {
          const pos = getCellPosition(selectedCell);
          let newAddress;
          if (e.shiftKey) {
            if (pos.col > 0) {
              newAddress = getCellAddress(pos.row, pos.col - 1);
            } else if (pos.row > 0) {
              newAddress = getCellAddress(pos.row - 1, TOTAL_COLS - 1);
            }
          } else {
            if (pos.col < TOTAL_COLS - 1) {
              newAddress = getCellAddress(pos.row, pos.col + 1);
            } else if (pos.row < TOTAL_ROWS - 1) {
              newAddress = getCellAddress(pos.row + 1, 0);
            }
          }
          if (newAddress) {
            setSelectedCell(newAddress);
            setSelectedRange([newAddress]);
            setSelectionStart(newAddress);
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentDoc) {
          const currentData = data[currentDoc.id] || {};
          apiSaveDocumentData(currentDoc.id, currentData);
          setSaveStatus('saved');
          setHasUnsavedChanges(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handleCut, handlePaste, handleSelectAll, handleClearCell, selectedCell, TOTAL_COLS, TOTAL_ROWS, currentDoc, data, getCurrentStyles, updateCellStyles]);
  
  const exportToCSV = () => {
    if (!currentDoc) return;
    const docData = data[currentDoc.id] || {};
    const headers = Array.from({ length: TOTAL_COLS }, (_, i) => colToLetter(i)).join(',');
    let csv = headers + '\n';
    
    for (let row = 0; row < TOTAL_ROWS; row++) {
      const rowData = [];
      for (let col = 0; col < TOTAL_COLS; col++) {
        const address = getCellAddress(row, col);
        const cell = docData[address];
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
    link.download = `${currentDoc.name}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setExportMenu(null);
  };
  
  const exportToJSON = () => {
    if (!currentDoc) return;
    const docData = data[currentDoc.id] || {};
    const exportData = {
      name: currentDoc.name,
      rows: TOTAL_ROWS,
      cols: TOTAL_COLS,
      data: docData,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDoc.name}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setExportMenu(null);
  };
  
  if (loading) {
    return <div className="loading-container"><div className="loader"></div><p>Загрузка документа...</p></div>;
  }
  
  if (!currentDoc) {
    return null;
  }
  
  const breadcrumbs = (
    <div className="breadcrumbs">
      <span onClick={() => navigate('/dashboard')}>Мои документы</span>
      <span>→</span>
      <span>{currentDoc.name}</span>
    </div>
  );
  
  return (
    <div className="spreadsheet-container">
      <div className="spreadsheet-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Назад</button>
        <div className="doc-info">
          <span className="doc-name">{currentDoc.name}</span>
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saved' && 'Сохранено'}
            {saveStatus === 'saving' && 'Сохранение...'}
            {saveStatus === 'error' && 'Ошибка сохранения'}
          </span>
        </div>
        {breadcrumbs}
        <div className="export-buttons">
          <button className="export-btn" onClick={exportToCSV}>CSV</button>
          <button className="export-btn" onClick={exportToJSON}>JSON</button>
        </div>
        <button className="save-btn" onClick={() => {
          if (currentDoc) {
            const currentData = data[currentDoc.id] || {};
            apiSaveDocumentData(currentDoc.id, currentData);
            setSaveStatus('saved');
            setHasUnsavedChanges(false);
          }
        }}>Сохранить (Ctrl+S)</button>
      </div>
      
      <Toolbar selectedCell={selectedCell} onStyleChange={handleStyleChange} currentStyles={getCurrentStyles()} />
      
      <FormulaBar selectedCell={selectedCell} value={getFormulaBarValue()} onUpdate={updateFromFormulaBar} />
      
      <div className="selected-info">
        <strong>Выбрана ячейка: {selectedCell || '—'}</strong>
        {selectedRange.length > 1 && <span> | Выделено ячеек: {selectedRange.length}</span>}
      </div>
      
      <div className="spreadsheet">
        <div className="header-row">
          <div className="corner-cell"></div>
          {Array.from({ length: TOTAL_COLS }).map((_, colIndex) => (
            <div key={colIndex} className="col-header" style={{ width: getColWidth(colIndex), minWidth: getColWidth(colIndex) }}>
              {colToLetter(colIndex)}
              <div className="resize-handler" onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = getColWidth(colIndex);
                const onMouseMove = (moveEvent: MouseEvent) => {
                  handleResizeCol(colIndex, Math.max(60, startWidth + (moveEvent.clientX - startX)));
                };
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }} />
            </div>
          ))}
        </div>
        
        <div className="rows-container">
          {Array.from({ length: TOTAL_ROWS }).map((_, rowIndex) => (
            <div key={rowIndex} className="table-row">
              <div
                className="row-header"
                style={{ height: getRowHeight(rowIndex), minHeight: getRowHeight(rowIndex) }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'row', index: rowIndex });
                }}
              >
                {rowIndex + 1}
                <div className="row-resize-handler" onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startHeight = getRowHeight(rowIndex);
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    handleResizeRow(rowIndex, Math.max(24, startHeight + (moveEvent.clientY - startY)));
                  };
                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };
                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }} />
              </div>
              
              {Array.from({ length: TOTAL_COLS }).map((_, colIndex) => {
                const cellAddress = getCellAddress(rowIndex, colIndex);
                const isSelectedCell = selectedCell === cellAddress;
                const isInSelectedRange = isInRange(cellAddress);
                const cellStyle = currentDoc ? getCellStyle(currentDoc.id, cellAddress) : {};
                return (
                  <div key={colIndex} style={{ width: getColWidth(colIndex), minWidth: getColWidth(colIndex) }}>
                    <div
                      className={`cell ${isSelectedCell ? 'selected' : ''} ${isInSelectedRange && !isSelectedCell ? 'in-range' : ''}`}
                      style={{ height: getRowHeight(rowIndex), ...cellStyle }}
                      onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                      onDoubleClick={() => {
                        setSelectedCell(cellAddress);
                        const inputEvent = new KeyboardEvent('keydown', { key: 'Enter' });
                        document.dispatchEvent(inputEvent);
                      }}
                    >
                      {currentDoc ? getCellDisplay(currentDoc.id, rowIndex, colIndex) : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          index={contextMenu.index}
          onAdd={(type, index) => {
            if (currentDoc) {
              if (type === 'row') addRow(currentDoc.id, index);
              else addColumn(currentDoc.id, index);
            }
          }}
          onDelete={(type, index) => {
            if (currentDoc) {
              if (type === 'row') deleteRow(currentDoc.id, index);
              else deleteColumn(currentDoc.id, index);
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = mockAuth.getUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocRows, setNewDocRows] = useState(50);
  const [newDocCols, setNewDocCols] = useState(26);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [exportMenu, setExportMenu] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, DocumentData>>({});
  
  const loadDocuments = useCallback(async () => {
    if (!user) return;
    const docs = await apiFetchDocuments(user.email);
    setDocuments(docs);
    setLoading(false);
  }, [user]);
  
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);
  
useEffect(() => {
  documents.forEach(doc => {
    apiLoadDocumentData(doc.id).then(docData => {
      setData(prev => ({ ...prev, [doc.id]: docData }));
    });
  });
}, [documents]);
const createNewDocument = async () => {
  if (!newDocName.trim() || !user) return;
  try {
    const doc = await apiCreateDocument({
      name: newDocName,
      user: user.email,
      rows: newDocRows,
      cols: newDocCols,
      preview: [],
    });
    await loadDocuments();
    navigate(`/documents/${doc.id}`);
    setShowCreateModal(false);
    setNewDocName('');
  } catch (err) {
    console.error('Error creating document:', err);
  }
};
  
  const deleteDocument = async (id: string) => {
    const docsStored = localStorage.getItem(STORAGE_KEY);
    let docs: Document[] = docsStored ? JSON.parse(docsStored) : [];
    docs = docs.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    const dataStored = localStorage.getItem(DATA_KEY);
    const dataMap = dataStored ? JSON.parse(dataStored) : {};
    delete dataMap[id];
    localStorage.setItem(DATA_KEY, JSON.stringify(dataMap));
    await loadDocuments();
    setDeleteConfirmId(null);
  };
  
  const duplicateDocument = async (doc: Document) => {
    const docData = data[doc.id] || {};
    const newDoc = await apiCreateDocument({
      name: `${doc.name} (копия)`,
      user: user!.email,
      rows: doc.rows,
      cols: doc.cols,
      preview: [],
    });
    await apiSaveDocumentData(newDoc.id, docData);
    await loadDocuments();
  };
  
  const exportToCSV = (doc: Document) => {
    const docData = data[doc.id] || {};
    const headers = Array.from({ length: doc.cols }, (_, i) => colToLetter(i)).join(',');
    let csv = headers + '\n';
    
    for (let row = 0; row < doc.rows; row++) {
      const rowData = [];
      for (let col = 0; col < doc.cols; col++) {
        const address = getCellAddress(row, col);
        const cell = docData[address];
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
    link.download = `${doc.name}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setExportMenu(null);
  };
  
  const exportToJSON = (doc: Document) => {
    const docData = data[doc.id] || {};
    const exportData = {
      name: doc.name,
      rows: doc.rows,
      cols: doc.cols,
      data: docData,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.name}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setExportMenu(null);
  };
  
  const importCSV = (doc: Document, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newData: DocumentData = { ...data[doc.id] };
      const maxRows = Math.min(doc.rows, lines.length - 1);
      
      for (let i = 1; i <= maxRows; i++) {
        const cells = lines[i].split(',');
        for (let j = 0; j < Math.min(doc.cols, cells.length); j++) {
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
      
      setData(prev => ({ ...prev, [doc.id]: newData }));
      setExportMenu(null);
    };
    reader.readAsText(file);
  };
  
  if (loading) {
    return <div className="loading-container"><div className="loader"></div><p>Загрузка...</p></div>;
  }
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Мои документы</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Новый документ</button>
      </div>
      <div className="documents-grid">
        {documents.map((doc) => (
          <div key={doc.id} className="document-card">
            <div className="document-info" onClick={() => navigate(`/documents/${doc.id}`)}>
              <div className="document-name">{doc.name}</div>
              <div className="document-meta">
                <span>Создан: {new Date(doc.createdAt).toLocaleDateString()}</span>
                <span>Изменён: {new Date(doc.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="document-actions">
              <div className="dropdown">
                <button className="btn-icon" onClick={() => setExportMenu(exportMenu === doc.id ? null : doc.id)}>⋮</button>
                {exportMenu === doc.id && (
                  <div className="dropdown-menu">
                    <button onClick={() => duplicateDocument(doc)}>Копировать</button>
                    <button onClick={() => exportToCSV(doc)}>Экспорт в CSV</button>
                    <button onClick={() => exportToJSON(doc)}>Экспорт в JSON</button>
                    <label className="dropdown-label">
                      Импорт CSV
                      <input type="file" accept=".csv" onChange={(e) => importCSV(doc, e)} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
              <button className="btn-icon" onClick={() => setDeleteConfirmId(doc.id)}>Удалить</button>
            </div>
            {deleteConfirmId === doc.id && (
              <div className="confirm-overlay">
                <div className="confirm-dialog">
                  <p>Удалить "{doc.name}"?</p>
                  <button onClick={() => deleteDocument(doc.id)}>Да</button>
                  <button onClick={() => setDeleteConfirmId(null)}>Нет</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Создать документ</h3>
            <div className="modal-field">
              <label>Название</label>
              <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="Моя таблица" autoFocus />
            </div>
            <div className="modal-field">
              <label>Размер</label>
              <div className="size-inputs">
                <input type="number" value={newDocRows} onChange={(e) => setNewDocRows(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))} min={1} max={1000} placeholder="Строки" />
                <span>×</span>
                <input type="number" value={newDocCols} onChange={(e) => setNewDocCols(Math.min(52, Math.max(1, parseInt(e.target.value) || 1)))} min={1} max={52} placeholder="Столбцы" />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)}>Отмена</button>
              <button className="btn-primary" onClick={createNewDocument}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const user = mockAuth.getUser();
  
  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Профиль пользователя</h2>
        <div className="form-group">
          <label>Имя</label>
          <input type="text" value={user?.name || ''} disabled />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={user?.email || ''} disabled />
        </div>
        <div className="form-group">
          <label>Дата регистрации</label>
          <input type="text" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''} disabled />
        </div>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>Назад</button>
      </div>
    </div>
  );
};

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="not-found">
      <h2>404 - Страница не найдена</h2>
      <button onClick={() => navigate('/dashboard')}>Вернуться на главную</button>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = mockAuth.getUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (!user) {
      const redirect = encodeURIComponent(location.pathname);
      navigate(`/login?redirect=${redirect}`);
    }
  }, [user, navigate, location]);
  
  if (!user) return null;
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const user = mockAuth.getUser();
  
  const handleLogout = () => {
    mockAuth.logout();
    navigate('/login');
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => navigate('/dashboard')}>Табличный процессор</h1>
        {user && (
          <div className="header-right">
            <span>{user.name}</span>
            <button onClick={() => navigate('/profile')}>Профиль</button>
            <button onClick={handleLogout}>Выйти</button>
          </div>
        )}
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate(redirectTo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Вход</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Вход...' : 'Войти'}</button>
        </form>
        <p className="auth-link">Нет аккаунта? <button onClick={() => navigate('/register')} className="link-btn">Зарегистрироваться</button></p>
      </div>
    </div>
  );
};

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(name, email, password, confirmPassword);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Регистрация</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Пароль (мин. 8 символов)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Подтверждение пароля</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Регистрация...' : 'Зарегистрироваться'}</button>
        </form>
        <p className="auth-link">Уже есть аккаунт? <button onClick={() => navigate('/login')} className="link-btn">Войти</button></p>
      </div>
    </div>
  );
};

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents/:documentId" element={<SpreadsheetEditor />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(mockAuth.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(mockAuth.isAuthenticated());
  
  const login = async (email: string, password: string): Promise<void> => {
    await mockAuth.login(email, password);
    setUser(mockAuth.getUser());
    setIsAuthenticated(true);
  };
  
  const register = async (name: string, email: string, password: string, confirmPassword: string): Promise<void> => {
    await mockAuth.register(name, email, password, confirmPassword);
    setUser(mockAuth.getUser());
    setIsAuthenticated(true);
  };
  
  const logout = () => {
    mockAuth.logout();
    setUser(null);
    setIsAuthenticated(false);
  };
  
  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated }}>
      <AppRouter />
    </AuthContext.Provider>
  );
};

export default App;