import * as t from "io-ts";
import { either, isRight } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";

/**
 * Creates an io-ts Type from a string enum
 */
export const strEnumType = <E>(e: object, name: string): t.Type<E> => {
  // create an object where the keys are the values
  // of the object passed as input and all values are undefined
  const valuesObject = Object.keys(e).reduce((o, k) => ({ ...o, [(e as any)[k]]: undefined }), {} as {
    readonly [k: string]: undefined;
  });
  return t.keyof(valuesObject, name) as any;
};

/**
 * Creates an io-ts Type from a numeric enum
 */
export const numEnumType = <E>(e: {[k in string]: any}, name: string): t.Type<E> => {
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

export const tJSONString = <C extends t.Mixed>(tCodec: C) => {
  type CType = t.TypeOf<typeof tCodec>;
  return new t.Type<CType, string, unknown>(
    `JSONString<${tCodec.name}>`,
    tCodec.is,
    (input: unknown, context: t.Context) => {
      const stringAndJson = either.chain(t.string.validate(input, context), (jsonStr: string) => {
        try {
          return t.success(JSON.parse(jsonStr));
        } catch (e) {
          return t.failure(input, context, e.toString());
        }
      });
      return either.chain(stringAndJson, (parsed: any) => {
        return tCodec.validate(parsed, context);
      });
      // return t.string
      //   .validate(input, context)
      //   .chain((jsonStr: string) => {
      //     try {
      //       return t.success(JSON.parse(jsonStr));
      //     } catch (e) {
      //       return t.failure(input, context, e.toString());
      //     }
      //   })
      //   .chain((parsed: any) => {
      //     return tCodec.validate(parsed, context);
      //   });
    },
    (value: CType): string => {
      return JSON.stringify(value);
    }
  );
};


// encodes a Map object as an array so it can be JSON.stringified
export const tMapAsArrayCodec = new t.Type<Map<any, any>, Array<[any, any]>, Array<[any, any]>>(
  "MapAsArray",
  (m): m is Map<any, any> => m instanceof Map,
  (input: Array<[any, any]>) => {
    // input
    return t.success(new Map(input));
  },
  (map: Map<any, any>): Array<[any, any]> => {
    return Array.from(map.entries());

  }
);

// hack for unsafe decoding, until we have codecs for everything
export function decodeOrThrow<ValueType, EncodedType>(
  codec: t.Type<ValueType, any, EncodedType>,
  encoded: EncodedType
): ValueType {
  const decoded = codec.decode(encoded);
  if (isRight(decoded)) return decoded.right;
  throw new Error(`Decode error: ${PathReporter.report(decoded)}`);
}
