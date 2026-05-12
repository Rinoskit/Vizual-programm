export type DeepReadonly<T> = T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

export type PickedByType<T, U> = {
    [P in keyof T as T[P] extends U ? P : never]: T[P];
};

export type EventHandlers<T> = {
    [P in keyof T as P extends string ? `on${Capitalize<P>}` : never]: (value: T[P]) => void;
};