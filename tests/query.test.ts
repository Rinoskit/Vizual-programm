import { describe, it, expect } from 'vitest';
import { query, where, sort, groupBy, having } from '../src/query';

type User = {
    id: number;
    name: string;
    surname: string;
    age: number;
    city: string;
};

const users: User[] = [
    { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
    { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
    { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
    { id: 4, name: "Mike", surname: "Doe", age: 35, city: "LA" },
];

describe('query pipeline', () => {
    const w = where<User>();
    const s = sort<User>();
    const g = groupBy<User>();
    const h = having<User>();

    it('should filter and sort correctly', () => {
        const pipeline = query<User>(
            w("name", "John"),
            w("surname", "Doe"),
            s("age")
        );

        const result = pipeline(users);

        expect(result).toEqual([
            { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
            { id: 1, name: "John", surname: "Doe", age: 34, city: "NY" },
            { id: 3, name: "John", surname: "Doe", age: 35, city: "LA" },
        ]);
    });

    it('should group by city and filter groups with more than one item', () => {
        const pipeline = query<User>(
            g("city"),
            h((group) => group.items.length > 1)
        );

        const result = pipeline(users);

        expect(result).toEqual([
            { key: "NY", items: [users[0], users[1]] },
            { key: "LA", items: [users[2], users[3]] },
        ]);
    });

    it('should combine filtering, grouping, and having', () => {
        const pipeline = query<User>(
            w("surname", "Doe"),
            g("city"),
            h((group) => group.items.some(u => u.age > 34))
        );

        const result = pipeline(users);

        expect(result).toEqual([
            { key: "LA", items: [users[2], users[3]] }
        ]);
    });

    it('should handle empty pipeline', () => {
        const pipeline = query<User>();
        const result = pipeline(users);
        expect(result).toEqual(users);
    });

    it('should handle multiple filters', () => {
        const pipeline = query<User>(
            w("name", "John"),
            w("surname", "Doe"),
            w("age", 33)
        );

        const result = pipeline(users);

        expect(result).toEqual([
            { id: 2, name: "John", surname: "Doe", age: 33, city: "NY" },
        ]);
    });

    it('should handle empty result', () => {
        const pipeline = query<User>(
            w("name", "NonExistent")
        );

        const result = pipeline(users);
        expect(result).toEqual([]);
    });
});