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