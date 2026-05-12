export function csvToJSON(lines: string[], delimiter: string): Record<string, string>[] {
    if (!Array.isArray(lines) || lines.length < 2) {
        throw new Error('Invalid input: must contain at least header and one data row');
    }

    const headers = lines[0].split(delimiter);
    
    if (headers.length === 0) {
        throw new Error('Invalid header: no columns defined');
    }

    return lines.slice(1).map((line, rowIndex) => {
        const values = line.split(delimiter);
        
        if (values.length !== headers.length) {
            throw new Error(`Row ${rowIndex + 2}: column count mismatch`);
        }

        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
            obj[header] = values[index];
        });
        return obj;
    });
}