export type Transform<T> = (data: T[]) => T[];

export type Where<T> = <K extends keyof T>(key: K, value: T[K]) => Transform<T>;

export type Sort<T> = <K extends keyof T>(key: K) => Transform<T>;

export type Group<T, K extends keyof T> = {
    key: T[K];
    items: T[];
};

export type GroupBy<T> = <K extends keyof T>(key: K) => Transform<Group<T, K>>;

export type GroupTransform<T, K extends keyof T> = (groups: Group<T, K>[]) => Group<T, K>[];

export type Having<T> = <K extends keyof T>(
    predicate: (group: Group<T, K>) => boolean
) => GroupTransform<T, K>;

export function query<T, K extends keyof T = never>(
    ...steps: Array<Transform<T> | GroupTransform<T, K>>
): Transform<T> {
    return (data: T[]): T[] => {
        let result: any = data;

        for (const step of steps) {
            result = step(result);
        }

        return result as T[];
    };
}

export const where = <T>(): Where<T> => 
    <K extends keyof T>(key: K, value: T[K]): Transform<T> =>
    (data: T[]): T[] => 
        data.filter(item => item[key] === value);

export const sort = <T>(): Sort<T> =>
    <K extends keyof T>(key: K): Transform<T> =>
    (data: T[]): T[] =>
        [...data].sort((a, b) => {
            const av = a[key];
            const bv = b[key];
            if (av < bv) return -1;
            if (av > bv) return 1;
            return 0;
        });

export const groupBy = <T>(): GroupBy<T> =>
    <K extends keyof T>(key: K): Transform<Group<T, K>> =>
    (data: T[]): Group<T, K>[] => {
        const groups = new Map<T[K], Group<T, K>>();
        
        for (const item of data) {
            const groupKey = item[key];
            const existing = groups.get(groupKey);
            
            if (existing) {
                existing.items.push(item);
            } else {
                groups.set(groupKey, { key: groupKey, items: [item] });
            }
        }
        
        return Array.from(groups.values());
    };

export const having = <T>(): Having<T> =>
    <K extends keyof T>(predicate: (group: Group<T, K>) => boolean): GroupTransform<T, K> =>
    (groups: Group<T, K>[]): Group<T, K>[] =>
        groups.filter(predicate);