import { promises as fs } from 'node:fs';
import { csvToJSON } from './csvToJSON.js';

export async function formatCSVFileToJSONFile(
    input: string,
    output: string,
    delimiter: string
): Promise<void> {
    try {
        const data = await fs.readFile(input, 'utf8');
        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        const jsonData = csvToJSON(lines, delimiter);
        const jsonString = JSON.stringify(jsonData, null, 2);
        
        await fs.writeFile(output, jsonString, 'utf8');
    } catch (error) {
        throw new Error(`Failed to process file: ${(error as Error).message}`);
    }
}