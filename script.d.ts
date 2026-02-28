export interface User {
    id: number;
    name: string;
    email?: string;
    isActive: boolean;
}
export declare function createUser(id: number, name: string, email?: string): User;
export type Genre = 'fiction' | 'non-fiction';
export interface Book {
    title: string;
    author: string;
    year?: number;
    genre: Genre;
}
export declare function createBook(book: Book): Book;
export declare function calculateArea(shape: 'circle', radius: number): number;
export declare function calculateArea(shape: 'square', side: number): number;
export type Status = 'active' | 'inactive' | 'new';
export declare function getStatusColor(status: Status): string;
export type StringFormatter = (str: string, uppercase?: boolean) => string;
export declare const capitalizeFirst: StringFormatter;
export declare const trimAndTransform: StringFormatter;
export declare function getFirstElement<T>(arr: T[]): T | undefined;
export interface HasId {
    id: number;
}
export declare function findById<T extends HasId>(items: T[], id: number): T | undefined;
//# sourceMappingURL=script.d.ts.map