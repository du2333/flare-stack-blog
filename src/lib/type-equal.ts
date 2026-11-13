/**
 * True when A and B are the same type, not merely assignable to each other:
 * an optional field, a missing field or a wider union makes it false.
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/** Compiles only when T is true: `type _Check = Expect<Equal<A, B>>`. */
export type Expect<T extends true> = T;
