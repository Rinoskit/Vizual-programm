import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import './App.css';

interface CellData {
  value: string | number | boolean;
  display: string | number;
  formula: string | null;
  dependencies: string[];
}

const colToLetter = (col: number): string => {
  return String.fromCharCode(65 + col);
};

const letterToCol = (letter: string): number => {
  return letter.charCodeAt(0) - 65;
};

const getCellAddress = (row: number, col: number): string => {
  return `${colToLetter(col)}${row + 1}`;
};

const getCellPosition = (address: string): { row: number; col: number } => {
  const match = address.match(/([A-Z]+)(\d+)/);
  if (!match) throw new Error(`Invalid address: ${address}`);
  return {
    col: letterToCol(match[1]),
    row: parseInt(match[2]) - 1
  };
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
      <button onClick={() => { onAdd(type, index); onClose(); }}>
        Вставить {type === 'row' ? 'строку' : 'столбец'}
      </button>
      <button onClick={() => { onDelete(type, index); onClose(); }}>
        Удалить {type === 'row' ? 'строку' : 'столбец'}
      </button>
    </div>
  );
};

const Spreadsheet: React.FC = () => {
  const TOTAL_COLS = 26;
  const TOTAL_ROWS = 100;
  const DEFAULT_COL_WIDTH = 100;
  const DEFAULT_ROW_HEIGHT = 32;
  
  const [data, setData] = useState<Record<string, CellData>>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; type: 'row' | 'col'; index: number } | null>(null);
  
  const getColWidth = (colIndex: number): number => {
    return colWidths[colIndex] || DEFAULT_COL_WIDTH;
  };
  
  const getRowHeight = (rowIndex: number): number => {
    return rowHeights[rowIndex] || DEFAULT_ROW_HEIGHT;
  };
  
  const recalcAllFormulas = useCallback(() => {
    setData(prevData => {
      const newData = { ...prevData };
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
      
      return newData;
    });
  }, []);
  
  const updateCell = useCallback((address: string, rawValue: string) => {
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
      const newData = { ...prev };
      
      if (isFormula) {
        const dependencies = getFormulaDependencies(rawValue);
        const result = evaluateFormula(rawValue, newData);
        newData[address] = { 
          value: rawValue, 
          display: result, 
          formula: rawValue, 
          dependencies 
        };
      } else if (isBool) {
        newData[address] = { 
          value: boolValue, 
          display: boolValue ? 'true' : 'false', 
          formula: null, 
          dependencies: [] 
        };
      } else {
        const numValue = Number(rawValue);
        const isNumber = !isNaN(numValue) && rawValue.trim() !== '';
        newData[address] = { 
          value: isNumber ? numValue : rawValue, 
          display: isNumber ? numValue : rawValue, 
          formula: null, 
          dependencies: [] 
        };
      }
      
      return newData;
    });
    
    setTimeout(() => recalcAllFormulas(), 10);
  }, [recalcAllFormulas]);
  
  const getCellDisplay = (row: number, col: number): any => {
    const address = getCellAddress(row, col);
    const cell = data[address];
    if (cell?.display !== undefined && cell.display !== '') return cell.display;
    if (cell?.value !== undefined && cell.value !== '') return cell.value;
    return '';
  };
  
  const getFormulaBarValue = (): string => {
    if (!selectedCell) return '';
    const cell = data[selectedCell];
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
    if (selectedCell) updateCell(selectedCell, value);
  };
  
  const addRow = (afterRowIndex: number) => {
    const newRowIndex = afterRowIndex + 1;
    const shiftedData: Record<string, CellData> = {};
    
    for (const [address, cellData] of Object.entries(data)) {
      const match = address.match(/([A-Z]+)(\d+)/);
      if (match) {
        const col = match[1];
        const row = parseInt(match[2]);
        if (row >= newRowIndex) {
          const newAddress = `${col}${row + 1}`;
          shiftedData[newAddress] = cellData;
        } else {
          shiftedData[address] = cellData;
        }
      }
    }
    
    setData(shiftedData);
    setTimeout(() => recalcAllFormulas(), 10);
  };
  
  const deleteRow = (rowIndex: number) => {
    const newData: Record<string, CellData> = {};
    for (const [address, cellData] of Object.entries(data)) {
      const match = address.match(/([A-Z]+)(\d+)/);
      if (match) {
        const col = match[1];
        const row = parseInt(match[2]);
        if (row === rowIndex + 1) continue;
        if (row > rowIndex + 1) {
          const newAddress = `${col}${row - 1}`;
          newData[newAddress] = cellData;
        } else {
          newData[address] = cellData;
        }
      }
    }
    setData(newData);
    setTimeout(() => recalcAllFormulas(), 10);
  };
  
  const addColumn = (afterColIndex: number) => {
    const newColIndex = afterColIndex + 1;
    const newData: Record<string, CellData> = {};
    
    for (const [address, cellData] of Object.entries(data)) {
      const match = address.match(/([A-Z]+)(\d+)/);
      if (match) {
        const colLetter = match[1];
        const row = match[2];
        const colIndex = letterToCol(colLetter);
        if (colIndex >= newColIndex) {
          const newColLetter = colToLetter(colIndex + 1);
          const newAddress = `${newColLetter}${row}`;
          newData[newAddress] = cellData;
        } else {
          newData[address] = cellData;
        }
      }
    }
    setData(newData);
    setTimeout(() => recalcAllFormulas(), 10);
  };
  
  const deleteColumn = (colIndex: number) => {
    const newData: Record<string, CellData> = {};
    for (const [address, cellData] of Object.entries(data)) {
      const match = address.match(/([A-Z]+)(\d+)/);
      if (match) {
        const colLetter = match[1];
        const row = match[2];
        const col = letterToCol(colLetter);
        if (col === colIndex) continue;
        if (col > colIndex) {
          const newColLetter = colToLetter(col - 1);
          const newAddress = `${newColLetter}${row}`;
          newData[newAddress] = cellData;
        } else {
          newData[address] = cellData;
        }
      }
    }
    setData(newData);
    setTimeout(() => recalcAllFormulas(), 10);
  };
  
  const handleResizeCol = (colIndex: number, newWidth: number) => {
    setColWidths(prev => ({ ...prev, [colIndex]: newWidth }));
  };
  
  const handleResizeRow = (rowIndex: number, newHeight: number) => {
    setRowHeights(prev => ({ ...prev, [rowIndex]: newHeight }));
  };
  
  useEffect(() => {
    const demoData: Record<string, CellData> = {
      'A1': { value: 10, display: 10, formula: null, dependencies: [] },
      'A2': { value: 20, display: 20, formula: null, dependencies: [] },
      'A3': { value: '=SUM(A1:A2)', display: 30, formula: '=SUM(A1:A2)', dependencies: ['A1', 'A2'] },
      'B1': { value: 5, display: 5, formula: null, dependencies: [] },
      'B2': { value: 3, display: 3, formula: null, dependencies: [] },
      'B3': { value: '=AVERAGE(B1:B2)', display: 4, formula: '=AVERAGE(B1:B2)', dependencies: ['B1', 'B2'] },
      'C1': { value: '=A1*2', display: 20, formula: '=A1*2', dependencies: ['A1'] },
    };
    setData(demoData);
  }, []);
  
  return (
    <div className="spreadsheet-container">
      <FormulaBar selectedCell={selectedCell} value={getFormulaBarValue()} onUpdate={updateFromFormulaBar} />
      
      <div className="selected-info">
        Выбрана ячейка: <strong>{selectedCell || '—'}</strong>
        {selectedRange.length > 1 && <span className="range-info"> | Выделено ячеек: {selectedRange.length}</span>}
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
                  const newWidth = startWidth + (moveEvent.clientX - startX);
                  handleResizeCol(colIndex, Math.max(60, newWidth));
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
                    const newHeight = startHeight + (moveEvent.clientY - startY);
                    handleResizeRow(rowIndex, Math.max(24, newHeight));
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
                const isSelected = selectedCell === cellAddress;
                const isInSelectedRange = isInRange(cellAddress);
                
                return (
                  <div key={colIndex} style={{ width: getColWidth(colIndex), minWidth: getColWidth(colIndex) }}>
                    <Cell
                      address={cellAddress}
                      value={getCellDisplay(rowIndex, colIndex)}
                      isSelected={isSelected}
                      isInRange={isInSelectedRange}
                      onUpdate={updateCell}
                      onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                      rowHeight={getRowHeight(rowIndex)}
                    />
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
            if (type === 'row') addRow(index);
            else addColumn(index);
          }}
          onDelete={(type, index) => {
            if (type === 'row') deleteRow(index);
            else deleteColumn(index);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <div className="app">
      <h1>Табличный процессор</h1>
      <Spreadsheet />
    </div>
  );
}

export default App;