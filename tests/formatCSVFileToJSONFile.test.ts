import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatCSVFileToJSONFile } from '../src/formatCSVFileToJSONFile.js';
import { promises as fs } from 'node:fs';

vi.mock('node:fs', () => ({
    promises: {
        readFile: vi.fn(),
        writeFile: vi.fn()
    }
}));

describe('formatCSVFileToJSONFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly read CSV and write JSON', async () => {
        const mockReadFile = vi.mocked(fs.readFile);
        const mockWriteFile = vi.mocked(fs.writeFile);
        
        mockReadFile.mockResolvedValue(
            'p1;p2;p3\n1;A;b\n2;B;v\n3;C;d'
        );
        mockWriteFile.mockResolvedValue();

        await formatCSVFileToJSONFile('input.csv', 'output.json', ';');

        expect(mockReadFile).toHaveBeenCalledWith('input.csv', 'utf8');
        expect(mockWriteFile).toHaveBeenCalledWith(
            'output.json',
            JSON.stringify([
                { p1: '1', p2: 'A', p3: 'b' },
                { p1: '2', p2: 'B', p3: 'v' },
                { p1: '3', p2: 'C', p3: 'd' }
            ], null, 2),
            'utf8'
        );
    });

    it('should throw error on file read failure', async () => {
        const mockReadFile = vi.mocked(fs.readFile);
        mockReadFile.mockRejectedValue(new Error('File not found'));

        await expect(
            formatCSVFileToJSONFile('input.csv', 'output.json', ';')
        ).rejects.toThrow('Failed to process file: File not found');

        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should throw error on invalid CSV data', async () => {
        const mockReadFile = vi.mocked(fs.readFile);
        mockReadFile.mockResolvedValue(
            'p1;p2;p3\n1;A\n2;B;C'
        );

        await expect(
            formatCSVFileToJSONFile('input.csv', 'output.json', ';')
        ).rejects.toThrow('Failed to process file: Row 2: column count mismatch');

        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle empty lines in file', async () => {
        const mockReadFile = vi.mocked(fs.readFile);
        const mockWriteFile = vi.mocked(fs.writeFile);
        
        mockReadFile.mockResolvedValue(
            'p1;p2;p3\n\n1;A;b\n\n2;B;c\n\n'
        );
        mockWriteFile.mockResolvedValue();

        await formatCSVFileToJSONFile('input.csv', 'output.json', ';');

        expect(mockWriteFile).toHaveBeenCalledWith(
            'output.json',
            JSON.stringify([
                { p1: '1', p2: 'A', p3: 'b' },
                { p1: '2', p2: 'B', p3: 'c' }
            ], null, 2),
            'utf8'
        );
    });
});