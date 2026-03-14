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

export type PipelineState = 'initial' | 'where' | 'groupBy' | 'having' | 'sort';

export interface WhereStep<T, State extends PipelineState> {
    where<K extends keyof T>(key: K, value: T[K]): WhereStep<T, 'where'> & NextSteps<T, 'where'>;
}

export interface GroupByStep<T, State extends PipelineState> {
    groupBy<K extends keyof T>(key: K): GroupByStep<T, 'groupBy'> & NextSteps<T, 'groupBy'>;
}

export interface HavingStep<T, State extends PipelineState, K extends keyof T = any> {
    having(predicate: (group: Group<T, K>) => boolean): HavingStep<T, 'having', K> & NextSteps<T, 'having', K>;
}

export interface SortStep<T, State extends PipelineState> {
    sort<K extends keyof T>(key: K): SortStep<T, 'sort'> & NextSteps<T, 'sort'>;
}

export type NextSteps<T, State extends PipelineState, K extends keyof T = any> = 
    State extends 'initial' ? WhereStep<T, 'where'> & GroupByStep<T, 'groupBy'> :
    State extends 'where' ? (WhereStep<T, 'where'> & GroupByStep<T, 'groupBy'>) :
    State extends 'groupBy' ? (HavingStep<T, 'having', K> & SortStep<T, 'sort'>) :
    State extends 'having' ? SortStep<T, 'sort'> :
    State extends 'sort' ? {} : never;

export type QueryBuilder<T> = 
    WhereStep<T, 'initial'> & 
    GroupByStep<T, never> & 
    HavingStep<T, never> & 
    SortStep<T, never> & {
        build(): Transform<T>;
    };

class QueryBuilderImpl<T> implements QueryBuilder<T> {
    private steps: Array<Transform<T> | GroupTransform<T, any>> = [];
    private state: PipelineState = 'initial';

    where<K extends keyof T>(key: K, value: T[K]): WhereStep<T, 'where'> & NextSteps<T, 'where'> {
        if (this.state !== 'initial' && this.state !== 'where') {
            throw new Error('where must come before groupBy, having, and sort');
        }
        this.state = 'where';
        const step: Transform<T> = (data) => data.filter(item => item[key] === value);
        this.steps.push(step);
        return this as any;
    }

    groupBy<K extends keyof T>(key: K): GroupByStep<T, 'groupBy'> & NextSteps<T, 'groupBy'> {
        if (this.state !== 'initial' && this.state !== 'where' && this.state !== 'groupBy') {
            throw new Error('groupBy must come after where and before having/sort');
        }
        this.state = 'groupBy';
        const step: Transform<Group<T, K>> = (data: any) => {
            const groups = new Map<T[K], Group<T, K>>();
            for (const item of data as T[]) {
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
        this.steps.push(step as any);
        return this as any;
    }

    having<K extends keyof T = any>(
        predicate: (group: Group<T, K>) => boolean
    ): HavingStep<T, 'having', K> & NextSteps<T, 'having', K> {
        if (this.state !== 'groupBy') {
            throw new Error('having must come after groupBy and before sort');
        }
        this.state = 'having';
        const step: GroupTransform<T, K> = (groups) => groups.filter(predicate);
        this.steps.push(step as any);
        return this as any;
    }

    sort<K extends keyof T>(key: K): SortStep<T, 'sort'> & NextSteps<T, 'sort'> {
        if (this.state !== 'initial' && this.state !== 'where' && this.state !== 'having' && this.state !== 'groupBy') {
            throw new Error('sort must come after where/groupBy/having');
        }
        this.state = 'sort';
        const step: Transform<T> = (data) => 
            [...data].sort((a, b) => {
                const av = a[key];
                const bv = b[key];
                if (av < bv) return -1;
                if (av > bv) return 1;
                return 0;
            });
        this.steps.push(step);
        return this as any;
    }

    build(): Transform<T> {
        return (data: T[]): T[] => {
            let result: any = data;
            for (const step of this.steps) {
                result = step(result);
            }
            return result as T[];
        };
    }
}

export function query<T>(): QueryBuilder<T> {
    return new QueryBuilderImpl<T>();
}