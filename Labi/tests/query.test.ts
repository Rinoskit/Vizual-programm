import { describe, it, expect, expectTypeOf } from 'vitest';
import { query } from '../src/query';

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

describe('query with type-safe order', () => {
    it('should allow correct order: where -> groupBy -> having -> sort', () => {
        const builder = query<User>()
            .where("name", "John")
            .where("surname", "Doe")
            .groupBy("city")
            .having(group => group.items.length > 1)
            .sort("age");

        expectTypeOf(builder.build).toBeFunction();
        
        const result = builder.build()(users);
        expect(result).toBeDefined();
    });

    it('should allow where only', () => {
        const builder = query<User>()
            .where("name", "John")
            .where("surname", "Doe");

        expectTypeOf(builder.build).toBeFunction();
    });

    it('should allow groupBy only', () => {
        const builder = query<User>()
            .groupBy("city");

        expectTypeOf(builder.build).toBeFunction();
    });

    it('should allow having only (after groupBy)', () => {
        const builder = query<User>()
            .groupBy("city")
            .having(group => group.items.length > 1);

        expectTypeOf(builder.build).toBeFunction();
    });

    it('should allow sort only', () => {
        const builder = query<User>()
            .sort("age");

        expectTypeOf(builder.build).toBeFunction();
    });

    it('should allow where -> sort', () => {
        const builder = query<User>()
            .where("name", "John")
            .sort("age");

        expectTypeOf(builder.build).toBeFunction();
    });

    it('should produce correct result with complex pipeline', () => {
        const pipeline = query<User>()
            .where("surname", "Doe")
            .groupBy("city")
            .having(group => group.items.some(u => u.age > 34))
            .sort("age")
            .build();

        const result = pipeline(users);
        
        expect(result).toEqual([
            { key: "LA", items: [users[2], users[3]] }
        ]);
    });
});