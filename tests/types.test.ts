import { describe, it, expectTypeOf } from 'vitest';
import { DeepReadonly, PickedByType, EventHandlers } from '../src/types';

describe('DeepReadonly', () => {
    it('should make all properties readonly recursively', () => {
        type Original = {
            a: number;
            b: {
                c: string;
                d: {
                    e: boolean;
                };
            };
        };

        type ReadonlyType = DeepReadonly<Original>;

        expectTypeOf<ReadonlyType>().toMatchTypeOf<{
            readonly a: number;
            readonly b: {
                readonly c: string;
                readonly d: {
                    readonly e: boolean;
                };
            };
        }>();

        expectTypeOf<ReadonlyType['a']>().not.toMatchTypeOf<{ write: true }>();
        expectTypeOf<ReadonlyType['b']['c']>().not.toMatchTypeOf<{ write: true }>();
        expectTypeOf<ReadonlyType['b']['d']['e']>().not.toMatchTypeOf<{ write: true }>();
    });

    it('should handle primitive types', () => {
        expectTypeOf<DeepReadonly<number>>().toEqualTypeOf<number>();
        expectTypeOf<DeepReadonly<string>>().toEqualTypeOf<string>();
        expectTypeOf<DeepReadonly<boolean>>().toEqualTypeOf<boolean>();
    });

    it('should handle arrays', () => {
        type Original = {
            arr: number[];
            nested: {
                items: string[];
            };
        };

        type ReadonlyType = DeepReadonly<Original>;

        expectTypeOf<ReadonlyType>().toMatchTypeOf<{
            readonly arr: readonly number[];
            readonly nested: {
                readonly items: readonly string[];
            };
        }>();
    });

    it('should handle union types', () => {
        type Original = {
            value: string | number;
            nested: {
                flag: boolean | null;
            };
        };

        type ReadonlyType = DeepReadonly<Original>;

        expectTypeOf<ReadonlyType>().toMatchTypeOf<{
            readonly value: string | number;
            readonly nested: {
                readonly flag: boolean | null;
            };
        }>();
    });
});

describe('PickedByType', () => {
    it('should pick properties of specific type', () => {
        type Original = {
            id: number;
            name: string;
            age: number;
            email: string;
            active: boolean;
        };

        type StringProps = PickedByType<Original, string>;
        type NumberProps = PickedByType<Original, number>;
        type BooleanProps = PickedByType<Original, boolean>;

        expectTypeOf<StringProps>().toEqualTypeOf<{
            name: string;
            email: string;
        }>();

        expectTypeOf<NumberProps>().toEqualTypeOf<{
            id: number;
            age: number;
        }>();

        expectTypeOf<BooleanProps>().toEqualTypeOf<{
            active: boolean;
        }>();
    });

    it('should return empty object if no properties of given type', () => {
        type Original = {
            id: number;
            name: string;
        };

        type BooleanProps = PickedByType<Original, boolean>;

        expectTypeOf<BooleanProps>().toEqualTypeOf<{}>();
    });

    it('should handle union types', () => {
        type Original = {
            id: number | string;
            name: string;
            value: number | boolean;
        };

        type StringProps = PickedByType<Original, string>;

        expectTypeOf<StringProps>().toEqualTypeOf<{
            id: number | string;
            name: string;
        }>();
    });

    it('should handle optional properties', () => {
        type Original = {
            id?: number;
            name: string;
            age?: number;
        };

        type NumberProps = PickedByType<Original, number>;

        expectTypeOf<NumberProps>().toEqualTypeOf<{
            id?: number;
            age?: number;
        }>();
    });
});

describe('EventHandlers', () => {
    it('should create event handlers with on prefix and capitalized names', () => {
        type Events = {
            click: MouseEvent;
            change: InputEvent;
            submit: SubmitEvent;
        };

        type Handlers = EventHandlers<Events>;

        expectTypeOf<Handlers>().toEqualTypeOf<{
            onClick: (value: MouseEvent) => void;
            onChange: (value: InputEvent) => void;
            onSubmit: (value: SubmitEvent) => void;
        }>();
    });

    it('should handle single property', () => {
        type Events = {
            load: Event;
        };

        type Handlers = EventHandlers<Events>;

        expectTypeOf<Handlers>().toEqualTypeOf<{
            onLoad: (value: Event) => void;
        }>();
    });

    it('should handle multiple properties with different types', () => {
        type Events = {
            data: string;
            error: Error;
            complete: boolean;
        };

        type Handlers = EventHandlers<Events>;

        expectTypeOf<Handlers>().toEqualTypeOf<{
            onData: (value: string) => void;
            onError: (value: Error) => void;
            onComplete: (value: boolean) => void;
        }>();
    });

    it('should handle empty object', () => {
        type Events = {};

        type Handlers = EventHandlers<Events>;

        expectTypeOf<Handlers>().toEqualTypeOf<{}>();
    });

    it('should preserve optionality', () => {
        type Events = {
            click?: MouseEvent;
            change: InputEvent;
        };

        type Handlers = EventHandlers<Events>;

        expectTypeOf<Handlers>().toEqualTypeOf<{
            onClick?: (value: MouseEvent) => void;
            onChange: (value: InputEvent) => void;
        }>();
    });

    it('should handle numeric keys', () => {
        type Events = {
            0: string;
            1: number;
        };

        type Handlers = EventHandlers<Events>;

        expectTypeOf<Handlers>().toEqualTypeOf<{
            on0: (value: string) => void;
            on1: (value: number) => void;
        }>();
    });
});