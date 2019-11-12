import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import { isRight } from "fp-ts/lib/Either";

expect.extend({ toDecodeWith });

export function expectToDecodeWithAndEqual<DecodedType>(data: any, codec: t.Type<DecodedType, any, any>, expectedValue: any): void {
  expect(data).toDecodeWith(codec);
  const decoded = codec.decode(data);
  expect(isRight(decoded)).toBe(true);
  if(isRight(decoded)) {
    expect(decoded.right).toEqual(expectedValue);
  }
}

export function toDecodeWith<DecodedType>(data: any, codec: t.Type<DecodedType>): jest.CustomMatcherResult {
  const result = codec.decode(data);
  const pass = isRight(result);
  //@ts-ignore
  const that: jest.MatcherUtils = this;
  const options = {
    isNot: that.isNot,
    //@ts-ignore
    promise: that.promise
  };

  return {
    pass,
    message: isRight(result)
      ? () =>
        //@ts-ignore
        that.utils.matcherHint("toDecodeWith", "data", "codec", options) +
        `\n\n` +
        `Decoded successfully (expected not to)\n` +
        `Data: ${JSON.stringify(data)}\n` +
        `Decoded value: ${JSON.stringify(result.right)}`
      : () =>
        //@ts-ignore
        that.utils.matcherHint("toDecodeWith", "data", "codec", options) +
        `\n\n` +
        `Failed to decode data with codec\n` +
        `${PathReporter.report(result)[0]}\n` +
        `Data: ${JSON.stringify(data)}\n`
  };
}


// export function toDecodeWithAndEqual<DecodedType>(data: any, codec: t.Type<DecodedType>, expectedValue: DecodedType): jest.CustomMatcherResult {
//   const decodeWithResult = toDecodeWith(data, codec);
//   if(!decodeWithResult.pass) return decodeWithResult;
//
//   const result = codec.decode(data);
//   if(!isRight(result)) throw new Error("??");
//   else {
//     const x = expect(result.right).toEqual(expectedValue)
//     return expect(result.right).toEqual(expectedValue);
//   }
// }
