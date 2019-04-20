import * as t from "io-ts";

/**
 * Returns an object where the keys are the values
 * of the object passed as input and all values are undefined
 */
const getObjectValues = (e: object) =>
  Object.keys(e).reduce(
    // tslint:disable-next-line:no-any
    (o, k) => ({ ...o, [(e as any)[k]]: undefined }),
    {} as { readonly [k: string]: undefined }
  );

/**
 * Creates an io-ts Type from a string enum
 */
export const strEnumType = <E>(e: object, name: string): t.Type<E> =>
  // tslint:disable-next-line:no-any
  t.keyof(getObjectValues(e), name) as any;

/**
 * Creates an io-ts Type from a numeric enum
 */
export const numEnumType = <E>(e: object, name: string): t.Type<E> => {
  const numValues: ReadonlyArray<number> = Object.keys(e)
    .map(k => e[k])
    .filter(t.number.is);
  if (!numValues.length) {
    return t.never as any;
  } else if (numValues.length === 1) {
    return t.literal(numValues[0]) as any;
  } else {
    return t.union(numValues.map(num => t.literal(num)) as any, name);
  }
};

// const getLiteralUnionFromValues = (e: object) =>
//   Object.keys(e).map(
//     // tslint:disable-next-line:no-any
//     (o, k) => ()
//   )
