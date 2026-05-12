import { describe, it, expect } from 'vitest';
import { csvToJSON } from '../src/csvToJSON.js';

describe('csvToJSON', () => {
    it('should correctly convert valid CSV data', () => {
        const input = [
            'p1;p2;p3;p4',
            '1;A;b;c',
            '2;B;v;d'
        ];
        
        const result = csvToJSON(input, ';');
        
        expect(result).toEqual([
            { p1: '1', p2: 'A', p3: 'b', p4: 'c' },
            { p1: '2', p2: 'B', p3: 'v', p4: 'd' }
        ]);
    });

    it('should work with different delimiter', () => {
        const input = [
            'name,age,city',
            'John,25,New York',
            'Anna,30,London'
        ];
        
        const result = csvToJSON(input, ',');
        
        expect(result).toEqual([
            { name: 'John', age: '25', city: 'New York' },
            { name: 'Anna', age: '30', city: 'London' }
        ]);
    });

    it('should throw error on empty array', () => {
        expect(() => csvToJSON([], ';')).toThrow('Invalid input: must contain at least header and one data row');
    });

    it('should throw error if only header', () => {
        expect(() => csvToJSON(['p1;p2'], ';')).toThrow('Invalid input: must contain at least header and one data row');
    });

    it('should throw error on column count mismatch', () => {
        const input = [
            'p1;p2;p3',
            '1;A',
            '2;B;C'
        ];
        
        expect(() => csvToJSON(input, ';')).toThrow('Row 2: column count mismatch');
    });

    it('should throw error if header is empty', () => {
        expect(() => csvToJSON(['', '1;2'], ';')).toThrow('Invalid header: no columns defined');
    });
});