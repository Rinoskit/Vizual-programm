export interface User {
    id: number;
    name: string;
    email?: string;
    isActive: boolean;
}

export function createUser(id: number, name: string, email?: string): User {
    return {
        id,
        name,
        email,
        isActive: true
    };
}

export type Genre = 'fiction' | 'non-fiction';

export interface Book {
    title: string;
    author: string;
    year?: number;
    genre: Genre;
}

export function createBook(book: Book): Book {
    return book;
}

export function calculateArea(shape: 'circle', radius: number): number;
export function calculateArea(shape: 'square', side: number): number;
export function calculateArea(shape: 'circle' | 'square', parameter: number): number {
    if (shape === 'circle') {
        return Math.PI * parameter * parameter;
    } else {
        return parameter * parameter;
    }
}

export type Status = 'active' | 'inactive' | 'new';

export function getStatusColor(status: Status): string {
    if (status === 'active') {
        return 'green';
    } else if (status === 'inactive') {
        return 'red';
    } else {
        return 'yellow';
    }
}

export type StringFormatter = (str: string, uppercase?: boolean) => string;

export const capitalizeFirst: StringFormatter = (str, uppercase = false) => {
    let result = str.charAt(0).toUpperCase() + str.slice(1);
    if (uppercase) {
        result = result.toUpperCase();
    }
    return result;
};

export const trimAndTransform: StringFormatter = (str, uppercase = false) => {
    let result = str.trim();
    if (uppercase) {
        result = result.toUpperCase();
    }
    return result;
};

export function getFirstElement<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[0] : undefined;
}

export interface HasId {
    id: number;
}

export function findById<T extends HasId>(items: T[], id: number): T | undefined {
    return items.find(item => item.id === id);
}